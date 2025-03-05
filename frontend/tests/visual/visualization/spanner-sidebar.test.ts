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
 *
 *
 */

/**
 * @jest-environment puppeteer
 */

describe('SpannerSidebar', () => {
    beforeEach(async () => {
        await page.goto('http://localhost:8080/static/test.html');
        // let the graph settle
        await new Promise(resolve => setTimeout(resolve, 2000));
    });

    describe('Default Graph View', () => {
        beforeEach(async () => {
            await page.evaluate(() => {
                const button: HTMLButtonElement | null = document.querySelector('#view-default')
                if (button) {
                    button.click();
                }
            });
        });

        it('should not be visible with nothing selected', async () => {
            const sidebarMount = await page.$('.sidebar');
            expect(sidebarMount).toBeTruthy();
            expect(await sidebarMount.isIntersectingViewport()).toBeFalsy();

            const image = await page.screenshot();
            expect(Buffer.from(image)).toMatchImageSnapshot({
                failureThreshold: 0.05,
                failureThresholdType: 'percent'
            });
        });

        it('should show selected node', async () => {
            await page.evaluate(() => {
                window.app.store.setSelectedObject(window.app.store.getNodes()[0]);
            });

            const image = await page.screenshot();
            expect(Buffer.from(image)).toMatchImageSnapshot({
                failureThreshold: 0.05,
                failureThresholdType: 'percent'
            });
        });

        it('should show selected edge', async () => {
            await page.evaluate(() => {
                window.app.store.setSelectedObject(window.app.store.getEdges()[0]);
            });

            const image = await page.screenshot();
            expect(Buffer.from(image)).toMatchImageSnapshot({
                failureThreshold: 0.05,
                failureThresholdType: 'percent'
            });
        });
    });

    describe('Table View', () => {
        beforeEach(async () => {
            await page.evaluate(() => {
                const button: HTMLButtonElement | null = document.querySelector('#view-table')
                if (button) {
                    button.click();
                }
            });
        });

        it('should not be visible', async () => {
            const sidebarMount = await page.$('.sidebar');
            expect(sidebarMount).toBeTruthy();
            expect(await sidebarMount.isIntersectingViewport()).toBeFalsy();

            const image = await page.screenshot();
            expect(Buffer.from(image)).toMatchImageSnapshot({
                failureThreshold: 0.05,
                failureThresholdType: 'percent'
            });
        });
    });

    describe('Schema View', () => {
        beforeEach(async () => {
            await page.evaluate(() => {
                const button: HTMLButtonElement | null = document.querySelector('#view-schema')
                if (button) {
                    button.click();
                }
            });

            await new Promise(resolve => setTimeout(resolve, 1000));
        });

        it('should be immediately visible with nothing selected', async () => {
            const sidebarMount = await page.$('.sidebar');
            expect(sidebarMount).toBeTruthy();

            const image = await page.screenshot();
            expect(Buffer.from(image)).toMatchImageSnapshot({
                failureThreshold: 0.05,
                failureThresholdType: 'percent'
            });
        });

        it('should show selected node', async () => {
            await page.evaluate(() => {
                window.app.store.setSelectedObject(window.app.store.getNodes()[0]);
            });

            const image = await page.screenshot();
            expect(Buffer.from(image)).toMatchImageSnapshot({
                failureThreshold: 0.05,
                failureThresholdType: 'percent'
            });
        });

        it('should show selected edge', async () => {
            await page.evaluate(() => {
                window.app.store.setSelectedObject(window.app.store.getEdges()[0]);
            });

            const image = await page.screenshot();
            expect(Buffer.from(image)).toMatchImageSnapshot({
                failureThreshold: 0.05,
                failureThresholdType: 'percent'
            });
        });
    });
});