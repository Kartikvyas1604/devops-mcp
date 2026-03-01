import * as assert from 'assert';
import * as vscode from 'vscode';
import { activate } from '../../src/extension';

suite('Extension Tests', () => {
    let disposable: vscode.Disposable;

    setup(async () => {
        disposable = await activate();
    });

    teardown(() => {
        disposable.dispose();
    });

    test('should activate the extension', () => {
        assert.ok(vscode.extensions.getExtension('your.extension.id'));
    });

    // Add more tests for specific functionalities here
});