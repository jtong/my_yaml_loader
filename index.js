const fs = require('fs/promises');
const path = require('path');
const yaml = require('js-yaml');
const ejs = require('ejs');

// const options = {
//   views : [path.join(process.cwd(), "/intentions/v2/common/library")]
// }
// console.log(options)
/**
 * 从JSON指针中获取对应的值
 * @param {Object} obj - 要获取值的对象
 * @param {string} pointer - JSON指针
 * @returns {any} 对应的值
 */
function getValueByPointer(obj, pointer) {
    const parts = pointer.split('/');

    let result = obj;
    for (const part of parts) {
        if (typeof result !== 'object' || result === null) {
            return undefined;
        }
        result = result[part];
    }
    return result;
}

/**
 * 读取指定路径的YAML文件，并解析其中的JSON指针
 * @param {string} filepath - YAML文件的路径
 * @param {string} workdir - 递归读取时使用的工作目录
 * @returns {Promise<any>} 解析后的JSON对象
 */
module.exports = async function loadYamlFile(filepath, workdir = path.dirname(filepath), context) {
    const content = await fs.readFile(filepath, 'utf8');
    const newContext = {...context};
    // 根据传入的 context 进行模板渲染
    const renderedContent = context !== undefined ? ejs.render(content, newContext) : content;
    // console.log(context)
    // console.log(renderedContent)


    const data = yaml.load(renderedContent);

    const processRef = async (obj, context) => {
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
                        const processedItem = await processRef(additionalItem, context);
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
                    const processedItem = await processRef(item, context);
                    result.push(processedItem);
                }
            }
            
            return result;
        }
        
        if (typeof obj === 'object' && obj !== null) {
            if ('$ref' in obj) {
                const refPath = path.join(workdir, obj.$ref.split('#')[0]);
                const pointer = obj.$ref.split('#')[1];

                // 从 context 中取出以 obj.$ref 的属性值作为属性名的值作为新的 context，向下传递
                const newContext = context ? context[obj.$ref] : undefined;
                const refData = await loadYamlFile(refPath, path.dirname(refPath), newContext);
                const value = getValueByPointer(refData, pointer);

                if (Array.isArray(value)) {  // 如果引用的值是数组，则直接返回数组
                    return await processRef(value, context); // 对数组元素递归调用processRef
                } else if (typeof value === 'object' && value !== null) {
                    // 如果引用的值是对象，则将当前对象的其他属性与其合并
                    const newObj = {...obj};
                    delete newObj.$ref;
                    for (const prop in newObj) {
                        newObj[prop] = await processRef(newObj[prop], context);
                    }
                    return {...value, ...newObj};
                } else {
                    // 否则，直接返回值
                    return value;
                }
            } else if ('$p_ref' in obj) {
                const refPath = path.join(workdir, obj.$p_ref.$ref.split('#')[0]);
                const pointer = obj.$p_ref.$ref.split('#')[1];

                // 从 context 中取出 $p_ref 中 params 属性的值，作为模板渲染时的 context
                const params = obj.$p_ref.params || {};

                const fromContext = context && context[obj.$ref] ? context[obj.$ref] : {};
                const newContext = {...fromContext, ...params};

                const refData = await loadYamlFile(refPath, path.dirname(refPath), newContext);

                // const renderedContent = ejs.render(await fs.readFile(refPath, 'utf8'), {...newContext}, options);
                // console.log(renderedContent)
                // const refData = yaml.load(renderedContent);
                const value = getValueByPointer(refData, pointer);

                if (Array.isArray(value)) {  // 如果引用的值是数组，则直接返回数组
                    return await processRef(value, context); // 对数组元素递归调用processRef
                } else if (typeof value === 'object' && value !== null) {
                    // 如果引用的值是对象，则将当前对象的其他属性与其合并
                    const newObj = {...obj};
                    delete newObj.$p_ref;
                    for (const prop in newObj) {
                        newObj[prop] = await processRef(newObj[prop], context);
                    }
                    return {...value, ...newObj};
                } else {
                    // 否则，直接返回值
                    return value;
                }
            } else if ('$flaten' in obj) { // 处理 $flaten
                const results = [];
                for (const item of obj.$flaten) {
                    const processedItem = await processRef(item, context);
                    if (Array.isArray(processedItem)) {
                        results.push(...processedItem);
                    } else {
                        results.push(processedItem);
                    }
                }
                return results;
            } else {
                for (const prop in obj) {
                    obj[prop] = await processRef(obj[prop], context);
                }
            }
        }
        return obj;
    };

    return await processRef(data, context);
};

function getValueByPointer(obj, pointer) {
    if (!pointer) {
        return obj;
    }
    const keys = pointer.split('/');
    let result = obj;
    for (const key of keys) {
        if (key !== '') {
            result = result[key];
        }
    }
    return result;
}


// // 调用loadYamlFile函数并输出结果
// (async () => {
//   const data = await loadYamlFile('./yaml/base.yml');
//   console.log(JSON.stringify(data, null, 2));
// })();