const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const expect = require('chai').expect;
const { describe, it } = require('mocha');

// 引入被测对象
const loadYamlFile = require('../index.js');

// 定义测试用例根目录
const casesRootDir = path.join(__dirname, 'cases');

// 递归遍历目录并获取所有测试用例文件
function getTestCases(dir) {
    const testCases = [];
    const files = fs.readdirSync(dir);

    for (const file of files) {
        const filePath = path.join(dir, file);
        const stats = fs.statSync(filePath);

        if (stats.isDirectory()) {
            testCases.push(...getTestCases(filePath));
        } else if (file === 'test_case.yaml') {
            // 只处理 test_case.yaml 文件
            const testCase = yaml.load(fs.readFileSync(filePath, 'utf8'));
            testCases.push({ testCase, dir });
        }
    }

    return testCases;
}

describe('YAML文件加载和解析测试', function() {
    const testCases = getTestCases(casesRootDir);

    testCases.forEach(({ testCase, dir }) => {
        it(testCase.desc, async function() {
            const workdir = path.join(dir, 'data');
            const filepath = path.join(workdir, testCase.given.filepath);
            const context = testCase.given.context;
            
            try {
                const actualResult = await loadYamlFile(filepath, workdir, context);
                const expectedResult = testCase.then.expectedResult;
                
                expect(actualResult).to.deep.equal(expectedResult);
            } catch (error) {
                if (testCase.then.error) {
                    expect(error.message).to.include(testCase.then.error);
                } else {
                    throw error;
                }
            }
        });
    });
});