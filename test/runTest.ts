import * as path from 'path';
import * as Mocha from 'mocha';
import * as glob from 'glob';

const runTest = async () => {
    const mocha = new Mocha({
        ui: 'bdd',
        color: true,
    });

    const testFiles = glob.sync('**/*.test.ts', { cwd: path.join(__dirname, 'suite') });
    testFiles.forEach((file) => mocha.addFile(path.join(__dirname, 'suite', file)));

    try {
        await new Promise((resolve, reject) => {
            mocha.run((failures) => {
                if (failures) {
                    reject(new Error(`${failures} tests failed.`));
                } else {
                    resolve();
                }
            });
        });
    } catch (error) {
        console.error('Test run failed:', error);
    }
};

runTest();