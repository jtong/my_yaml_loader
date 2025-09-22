const fs = require('fs/promises');
const path = require('path');
const yaml = require('js-yaml');
const ejs = require('ejs');

/**
 * 从JSON指针中获取对应的值
 * @param {Object} obj - 要获取值的对象
 * @param {string} pointer - JSON指针
 * @returns {any} 对应的值
 */
function getValueByPointer(obj, pointer) {
    if (!pointer) {
        return obj;
    }
    const keys = pointer.split('/');
    let result = obj;
    for (const key of keys) {
        if (key !== '') {
            if (typeof result !== 'object' || result === null) {
                return undefined;
            }
            result = result[key];
        }
    }
    return result;
}

/**
 * 核心处理函数 - 处理 YAML 对象中的引用
 * @param {any} obj - 要处理的对象
 * @param {Object} context - 上下文对象
 * @param {string} workdir - 工作目录
 * @param {Function} fileLoader - 文件加载函数
 * @returns {Promise<any>} 处理后的对象
 */
async function processRef(obj, context, workdir, fileLoader) {
    if (Array.isArray(obj)) {
        // 处理数组中的 $additional_items
        const result = [];
        
        for (let i = 0; i < obj.length; i++) {
            const item = obj[i];
            
            if (typeof item === 'object' && item !== null && '$additional_items' in item) {
                // 处理 $additional_items
                const additionalItems = item.$additional_items;
                const processedItems = [];
                
                for (const additionalItem of additionalItems) {
                    const processedItem = await processRef(additionalItem, context, workdir, fileLoader);
                    if (Array.isArray(processedItem)) {
                        processedItems.push(...processedItem);
                    } else {
                        processedItems.push(processedItem);
                    }
                }
                
                // 将处理后的项目添加到结果中（展开数组）
                result.push(...processedItems);
            } else {
                // 处理普通项目
                const processedItem = await processRef(item, context, workdir, fileLoader);
                result.push(processedItem);
            }
        }
        
        return result;
    }
    
    if (typeof obj === 'object' && obj !== null) {
        if ('$ref' in obj) {
            const refPath = path.resolve(workdir, obj.$ref.split('#')[0]);
            const pointer = obj.$ref.split('#')[1];

            // 从 context 中取出以 obj.$ref 的属性值作为属性名的值作为新的 context，向下传递
            const newContext = context ? context[obj.$ref] : undefined;
            const refData = await fileLoader(refPath, path.dirname(refPath), newContext);
            const value = getValueByPointer(refData, pointer);

            if (Array.isArray(value)) {  // 如果引用的值是数组，则直接返回数组
                return await processRef(value, context, workdir, fileLoader); // 对数组元素递归调用processRef
            } else if (typeof value === 'object' && value !== null) {
                // 如果引用的值是对象，则将当前对象的其他属性与其合并
                const newObj = {...obj};
                delete newObj.$ref;
                for (const prop in newObj) {
                    newObj[prop] = await processRef(newObj[prop], context, workdir, fileLoader);
                }
                return {...value, ...newObj};
            } else {
                // 否则，直接返回值
                return value;
            }
        } else if ('$p_ref' in obj) {
            const refPath = path.resolve(workdir, obj.$p_ref.$ref.split('#')[0]);
            const pointer = obj.$p_ref.$ref.split('#')[1];

            // 从 context 中取出 $p_ref 中 params 属性的值，作为模板渲染时的 context
            const params = obj.$p_ref.params || {};

            const fromContext = context && context[obj.$ref] ? context[obj.$ref] : {};
            const newContext = {...fromContext, ...params};

            const refData = await fileLoader(refPath, path.dirname(refPath), newContext);
            const value = getValueByPointer(refData, pointer);

            if (Array.isArray(value)) {  // 如果引用的值是数组，则直接返回数组
                return await processRef(value, context, workdir, fileLoader); // 对数组元素递归调用processRef
            } else if (typeof value === 'object' && value !== null) {
                // 如果引用的值是对象，则将当前对象的其他属性与其合并
                const newObj = {...obj};
                delete newObj.$p_ref;
                for (const prop in newObj) {
                    newObj[prop] = await processRef(newObj[prop], context, workdir, fileLoader);
                }
                return {...value, ...newObj};
            } else {
                // 否则，直接返回值
                return value;
            }
        } else if ('$flaten' in obj) { // 处理 $flaten
            const results = [];
            for (const item of obj.$flaten) {
                const processedItem = await processRef(item, context, workdir, fileLoader);
                if (Array.isArray(processedItem)) {
                    results.push(...processedItem);
                } else {
                    results.push(processedItem);
                }
            }
            return results;
        } else {
            for (const prop in obj) {
                obj[prop] = await processRef(obj[prop], context, workdir, fileLoader);
            }
        }
    }
    return obj;
}

/**
 * 读取指定路径的YAML文件，并解析其中的引用
 * @param {string} filepath - YAML文件的路径
 * @param {string} workdir - 递归读取时使用的工作目录
 * @param {Object} context - 模板渲染上下文
 * @returns {Promise<any>} 解析后的JSON对象
 */
async function loadYamlFile(filepath, workdir = path.dirname(filepath), context) {
    const content = await fs.readFile(filepath, 'utf8');
    return await loadYaml(content, workdir, context);
}

/**
 * 解析YAML文本内容，并处理其中的引用
 * @param {string} yamlContent - YAML文本内容
 * @param {string} workdir - 工作目录，用于解析相对路径引用
 * @param {Object} context - 模板渲染上下文
 * @returns {Promise<any>} 解析后的JSON对象
 */
async function loadYaml(yamlContent, workdir = process.cwd(), context) {
    const newContext = {...context};
    
    // 根据传入的 context 进行模板渲染
    const renderedContent = context !== undefined ? ejs.render(yamlContent, newContext) : yamlContent;
    
    const data = yaml.load(renderedContent);
    
    return await processRef(data, context, workdir, loadYamlFile);
}

module.exports = {
    getValueByPointer,
    processRef: async function(obj, context, workdir){
        return await processRef(obj, context, workdir, loadYamlFile);
    },
    loadYamlFile,
    loadYaml
};