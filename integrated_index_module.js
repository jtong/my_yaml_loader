/**
 * YAML加载器 - 统一入口文件
 * 
 * 本模块提供了YAML文件加载和处理功能，支持文件引用、参数化模板和动态内容生成。
 * 包含异步版本（推荐使用）和同步版本（已弃用）的API。
 */

// 导入核心异步功能
const {
    getValueByPointer,
    processRef,
    loadYamlFile,
    loadYaml
} = require('./core');

// 导入已弃用的同步功能
const {
    processRefSync,
    loadYamlFileSync,
    loadYamlSync
} = require('./sync');

/**
 * 导出统一的API接口
 * 
 * 主要异步API（推荐使用）：
 * - loadYamlFile: 异步加载YAML文件并处理引用
 * - loadYaml: 异步解析YAML内容并处理引用
 * 
 * 已弃用的同步API（未来版本将移除）：
 * - loadYamlFileSync: 同步加载YAML文件并处理引用
 * - loadYamlSync: 同步解析YAML内容并处理引用
 */
module.exports = {
    // 主要异步API
    loadYamlFile,
    loadYaml,
    
    // 已弃用的同步API
    loadYamlFileSync,
    loadYamlSync,
    
    // 内部工具函数（供高级用户使用）
    getValueByPointer,
    processRef,
    processRefSync
};