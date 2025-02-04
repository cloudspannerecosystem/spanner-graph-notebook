/**
 * Copyright 2025 Google LLC
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import path from "path";
import fs from "fs";

// @ts-ignore
const GraphServer = require('../../src/graph-server');

describe('GraphServer', () => {
    let graphServer: typeof GraphServer;
    const mockFetch = jest.fn();
    global.fetch = mockFetch;

    beforeEach(() => {
        mockFetch.mockClear();
        graphServer = new GraphServer(
            'http://test-url:8000',
            'test-project',
            'test-instance',
            'test-database',
            false
        );
    });

    describe('constructor', () => {
        it('should initialize with default values when no URL is provided', () => {
            const defaultServer = new GraphServer(
                null,
                'test-project',
                'test-instance',
                'test-database',
                false
            );
            expect(defaultServer.url).toBe('http://localhost:8195');
        });

        it('should use custom URL when provided', () => {
            expect(graphServer.url).toBe('http://test-url:8000');
        });

        it('should set project, instance, and database values', () => {
            expect(graphServer.project).toBe('test-project');
            expect(graphServer.instance).toBe('test-instance');
            expect(graphServer.database).toBe('test-database');
            expect(graphServer.mock).toBe(false);
        });
    });

    describe('buildRoute', () => {
        it('should correctly build route with endpoint', () => {
            const route = graphServer.buildRoute('/test-endpoint');
            expect(route).toBe('http://test-url:8000/test-endpoint');
        });
    });

    describe('query', () => {
        const mockDataPath = path.join(__dirname, '../mock-data.json');
        const mockData = JSON.parse(fs.readFileSync(mockDataPath, 'utf8'));

        beforeEach(() => {
            mockFetch.mockImplementation(() =>
                Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve(mockData)
                })
            );
        });

        it('should make POST request with correct parameters', async () => {
            const queryString = 'SELECT * FROM test';
            await graphServer.query(queryString);

            expect(mockFetch).toHaveBeenCalledWith(
                'http://test-url:8000/post_query',
                {
                    method: 'POST',
                    body: JSON.stringify({
                        query: queryString,
                        project: 'test-project',
                        instance: 'test-instance',
                        database: 'test-database',
                        mock: false
                    })
                }
            );
        });

        it('should parse the response', async () => {
            const queryString = 'SELECT * FROM test';
            const response = await graphServer.query(queryString);

            expect(response).toEqual(mockData);
        });

        it('should handle network errors', async () => {
            const errorMessage = 'Network error';
            mockFetch.mockImplementation(() => Promise.reject(new Error(errorMessage)));
            console.error = jest.fn();

            await graphServer.query('SELECT * FROM test');
            expect(console.error).toHaveBeenCalled();
        });

        it('should handle non-ok response', async () => {
            mockFetch.mockImplementation(() =>
                Promise.resolve({
                    ok: false
                })
            );
            console.error = jest.fn();

            await graphServer.query('SELECT * FROM test');
            expect(console.error).toHaveBeenCalled();
        });

        it('should set isFetching flag during request', async () => {
            const queryPromise = graphServer.query('SELECT * FROM test');
            expect(graphServer.isFetching).toBe(true);
            await queryPromise;
            expect(graphServer.isFetching).toBe(false);
        });

        it('should handle Colab environment', async () => {
            // @ts-ignore
            global.google = {
                colab: {
                    kernel: {
                        invokeFunction: jest.fn().mockResolvedValue({
                            data: {
                                'application/json': {data: 'test-response'}
                            }
                        })
                    }
                }
            };

            const result = await graphServer.query('SELECT * FROM test');
            expect(result).toEqual({data: 'test-response'});
            // @ts-ignore
            delete global.google;
        });
    });

    describe('ping', () => {
        beforeEach(() => {
            mockFetch.mockImplementation(() =>
                Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve({status: 'ok'})
                })
            );
            console.log = jest.fn();
        });

        it('should make GET request to ping endpoint', async () => {
            await graphServer.ping();
            expect(mockFetch).toHaveBeenCalledWith('http://test-url:8000/get_ping');
        });
    });
});