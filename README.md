# YAML加载器功能文档

## 概述

本YAML加载器是一个高级文件处理工具，支持复杂的文件引用、模板渲染和动态内容生成。该工具扩展了标准YAML功能，提供了文件间引用、参数传递、模板处理和数据合并等企业级功能。

## 核心功能详解

### 1. 基本文件引用 (`$ref`)

基本文件引用功能允许在YAML文件中引用其他文件的全部或部分内容，实现配置的模块化管理。

**完整文件引用示例：**

输入文件 `user-config.yml`：
```yaml
name: "John Doe"
email: "john@company.com"
department: "Engineering"
```

输入文件 `main-config.yml`：
```yaml
application:
  name: "MyApp"
  version: "1.0.0"
user:
  $ref: './user-config.yml'
```

处理结果：
```yaml
application:
  name: "MyApp"
  version: "1.0.0"
user:
  name: "John Doe"
  email: "john@company.com"
  department: "Engineering"
```

**部分内容引用示例（使用JSON指针）：**

输入文件 `database-config.yml`：
```yaml
connections:
  primary:
    host: "db-primary.company.com"
    port: 5432
    database: "production"
  secondary:
    host: "db-secondary.company.com"
    port: 5432
    database: "backup"
```

输入文件 `app-config.yml`：
```yaml
application:
  name: "DataProcessor"
database:
  $ref: './database-config.yml#connections/primary'
```

处理结果：
```yaml
application:
  name: "DataProcessor"
database:
  host: "db-primary.company.com"
  port: 5432
  database: "production"
```

### 2. 参数化引用 (`$p_ref`)

参数化引用功能允许向被引用的文件传递参数，实现模板化配置的动态生成。

**基本参数传递示例：**

输入文件 `service-template.yml`（EJS模板文件）：
```yaml
service:
  name: "<%= service.name %>"
  port: <%= service.port %>
  environment: "<%= service.environment %>"
  database:
    connection_string: "postgresql://user:pass@<%= service.database.host %>/<%= service.database.name %>"
```

输入文件 `production-config.yml`：
```yaml
services:
  api:
    $p_ref:
      $ref: './service-template.yml'
      params:
        service:
          name: "api-service"
          port: 8080
          environment: "production"
          database:
            host: "prod-db.company.com"
            name: "api_prod"
  worker:
    $p_ref:
      $ref: './service-template.yml'
      params:
        service:
          name: "worker-service"
          port: 8081
          environment: "production"
          database:
            host: "prod-db.company.com"
            name: "worker_prod"
```

处理结果：
```yaml
services:
  api:
    service:
      name: "api-service"
      port: 8080
      environment: "production"
      database:
        connection_string: "postgresql://user:pass@prod-db.company.com/api_prod"
  worker:
    service:
      name: "worker-service"
      port: 8081
      environment: "production"
      database:
        connection_string: "postgresql://user:pass@prod-db.company.com/worker_prod"
```

### 3. 上下文驱动的模板渲染

上下文功能允许在加载YAML文件时传递全局参数，这些参数可以在整个文件处理过程中使用。

**上下文传递示例：**

输入文件 `environment-config.yml`：
```yaml
application:
  name: "<%= env.app_name %>"
  debug: <%= env.debug_mode %>
  
database:
  host: "<%= env.db_host %>"
  port: <%= env.db_port %>
  
logging:
  level: "<%= env.log_level %>"
  output: "<%= env.log_output %>"
```

JavaScript调用代码：
```javascript
const context = {
  env: {
    app_name: "ProductionApp",
    debug_mode: false,
    db_host: "prod-database.company.com",
    db_port: 5432,
    log_level: "warn",
    log_output: "/var/log/app.log"
  }
};

const result = await loadYamlFile('./environment-config.yml', './', context);
```

处理结果：
```yaml
application:
  name: "ProductionApp"
  debug: false
  
database:
  host: "prod-database.company.com"
  port: 5432
  
logging:
  level: "warn"
  output: "/var/log/app.log"
```

### 4. 引用与属性合并

该功能允许在引用外部内容的同时添加或覆盖特定属性，实现灵活的配置组合。

**属性合并示例：**

输入文件 `base-server.yml`：
```yaml
server:
  protocol: "http"
  host: "localhost"
  port: 3000
  middleware:
    - "cors"
    - "body-parser"
```

输入文件 `production-server.yml`：
```yaml
production:
  $ref: './base-server.yml#server'
  protocol: "https"
  port: 443
  ssl:
    certificate: "/etc/ssl/cert.pem"
    private_key: "/etc/ssl/private.key"
```

处理结果：
```yaml
production:
  protocol: "https"
  host: "localhost"
  port: 443
  middleware:
    - "cors"
    - "body-parser"
  ssl:
    certificate: "/etc/ssl/cert.pem"
    private_key: "/etc/ssl/private.key"
```

### 5. 数组扁平化处理 (`$flaten`)

数组扁平化功能可以将多个数组或引用结果合并为单一扁平数组，适用于配置列表的动态组合。

**数组扁平化示例：**

输入文件 `frontend-routes.yml`：
```yaml
- path: "/"
  component: "HomePage"
- path: "/about"
  component: "AboutPage"
```

输入文件 `admin-routes.yml`：
```yaml
- path: "/admin"
  component: "AdminDashboard"
- path: "/admin/users"
  component: "UserManagement"
```

输入文件 `app-routes.yml`：
```yaml
routes:
  $flaten:
    - $ref: './frontend-routes.yml'
    - $ref: './admin-routes.yml'
    - - path: "/api"
        component: "APIEndpoint"
```

处理结果：
```yaml
routes:
  - path: "/"
    component: "HomePage"
  - path: "/about"
    component: "AboutPage"
  - path: "/admin"
    component: "AdminDashboard"
  - path: "/admin/users"
    component: "UserManagement"
  - path: "/api"
    component: "APIEndpoint"
```

### 6. 复杂模板函数处理

该功能支持在EJS模板中定义和使用复杂的数据转换函数，实现高级的数据处理逻辑。

**复杂模板函数示例：**

输入文件 `deployment-template.yml`：
```ejs
<% 
function generateContainerConfig(service, environment) {
  const config = {
    image: `${service.name}:${service.version}`,
    ports: service.ports.map(p => `${p}:${p}`),
    environment: {}
  };
  
  Object.keys(environment).forEach(key => {
    config.environment[key.toUpperCase()] = environment[key];
  });
  
  return config;
}

function generateHealthCheck(service) {
  return {
    test: `curl -f http://localhost:${service.ports[0]}/health || exit 1`,
    interval: "30s",
    timeout: "10s",
    retries: 3
  };
}
%>

services:
<% services.forEach(service => { %>
  <%= service.name %>:
    <%- JSON.stringify(generateContainerConfig(service, globalEnv), null, 4).split('\n').map((line, i) => i === 0 ? line : '    ' + line).join('\n') %>
    healthcheck:
      <%- JSON.stringify(generateHealthCheck(service), null, 4).split('\n').map((line, i) => i === 0 ? line : '      ' + line).join('\n') %>
<% }); %>
```

JavaScript调用代码：
```javascript
const context = {
  services: [
    {
      name: "api-service",
      version: "v1.2.0",
      ports: [8080, 9090]
    },
    {
      name: "worker-service", 
      version: "v1.1.0",
      ports: [8081]
    }
  ],
  globalEnv: {
    database_url: "postgresql://localhost/prod",
    redis_url: "redis://localhost:6379",
    log_level: "info"
  }
};

const result = await loadYamlFile('./deployment-template.yml', './', context);
```

处理结果：
```yaml
services:
  api-service:
    image: "api-service:v1.2.0"
    ports:
      - "8080:8080"
      - "9090:9090"
    environment:
      DATABASE_URL: "postgresql://localhost/prod"
      REDIS_URL: "redis://localhost:6379"
      LOG_LEVEL: "info"
    healthcheck:
      test: "curl -f http://localhost:8080/health || exit 1"
      interval: "30s"
      timeout: "10s"
      retries: 3
  worker-service:
    image: "worker-service:v1.1.0"
    ports:
      - "8081:8081"
    environment:
      DATABASE_URL: "postgresql://localhost/prod"
      REDIS_URL: "redis://localhost:6379"
      LOG_LEVEL: "info"
    healthcheck:
      test: "curl -f http://localhost:8081/health || exit 1"
      interval: "30s"
      timeout: "10s"
      retries: 3
```

## API 接口规范

### 主要函数签名

```javascript
async function loadYamlFile(filepath, workdir, context)
```

**参数详解：**
- `filepath`：目标YAML文件的完整路径或相对路径
- `workdir`：工作目录，用于解析相对路径引用，默认为目标文件所在目录
- `context`：可选的上下文对象，包含模板渲染所需的全局变量和参数

**返回值：**
返回Promise对象，解析后得到完整处理的JavaScript对象，所有引用已解析，所有模板已渲染。

### 使用示例

```javascript
const loadYamlFile = require('./yaml-loader');

// 基本文件加载
const basicConfig = await loadYamlFile('./config.yml');

// 带工作目录的加载
const moduleConfig = await loadYamlFile('module.yml', './configs');

// 带上下文的复杂加载
const context = {
  environment: 'production',
  version: '1.0.0',
  services: {...}
};
const deploymentConfig = await loadYamlFile('./deployment.yml', './templates', context);
```
