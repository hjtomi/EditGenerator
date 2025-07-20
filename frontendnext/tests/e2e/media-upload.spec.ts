import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs'; // Node.js file system module

test.describe('Media Upload and Conversion Flow', () => {

  test('should upload images, click next, then upload audio, and click generate video', async ({ page }) => {
    const imagesPageUrl = '/upload-files'; // Adjust this to your page's actual URL
    const image1Path = path.join(__dirname, '../fixtures/image1.png');
    const image2Path = path.join(__dirname, '../fixtures/image2.webp');
    const image3Path = path.join(__dirname, '../fixtures/image3.jpg');
    const image4Path = path.join(__dirname, '../fixtures/image4.jpeg');
    const audio1Path = path.join(__dirname, '../fixtures/audio1.mp3');

    // --- Step 1: Navigate to the Page ---
    await test.step('Navigate to the upload page', async () => {
      await page.goto(imagesPageUrl);
      await expect(page).toHaveURL(`http://localhost:3000${imagesPageUrl}`); // Verify URL
      await expect(page.locator('h2')).toHaveText('Select your images'); // Initial title
    });

    // --- Step 2: Wait for FFmpeg to load ---
    await test.step('Wait for FFmpeg to load', async () => {
      // Use a custom locator or text to wait for FFmpeg to finish loading
      // The `!ffmpegLoaded` message is a good candidate: "Loading video tools (FFmpeg)... Please wait."
      await expect(page.locator('.bg-yellow-50:has-text("Loading video tools (FFmpeg)... Please wait.")')).toBeHidden({ timeout: 30000 }); // Wait up to 30 seconds
      //await expect(page.locator('button:has-text("Next")')).not.toBeDisabled(); // Ensure button is enabled
    });

    // --- Step 3: Upload Images ---
    await test.step('Upload images', async () => {
      // Playwright's setInputFiles directly interacts with the hidden input
      const fileInput = page.locator('#file-input');
      await fileInput.setInputFiles([image1Path, image2Path, image3Path, image4Path]);

      // Verify selected files display
      await expect(page.locator('.selected-files-display')).toContainText('image1.png'); // Add a class for easier selection if possible
      await expect(page.locator('.selected-files-display li').nth(0)).toHaveText(/image1.png/);
      await expect(page.locator('.selected-files-display')).toContainText('image2.webp'); // Add a class for easier selection if possible
      await expect(page.locator('.selected-files-display li').nth(1)).toHaveText(/image2.webp/);
      await expect(page.locator('.selected-files-display')).toContainText('image3.jpg'); // Add a class for easier selection if possible
      await expect(page.locator('.selected-files-display li').nth(2)).toHaveText(/image3.jpg/);
      await expect(page.locator('.selected-files-display')).toContainText('image4.jpeg'); // Add a class for easier selection if possible
      await expect(page.locator('.selected-files-display li').nth(3)).toHaveText(/image4.jpeg/);
      
      // Verify the number of selected files
      await expect(page.locator('.selected-files-display li')).toHaveCount(4);
    });

    // --- Step 4: Click the "Next" button (Convert Images) ---
    await test.step('Click "Next" to convert images', async () => {
      const nextButton = page.locator('button:has-text("Next")');
      await nextButton.click();

      // Wait for the video generation process to start and finish if applicable
      await expect(page.locator('.bg-purple-50:has-text("Generating Video...")')).toBeVisible();
      // Wait for it to disappear, indicating completion, or for the new state to appear
      await expect(page.locator('.bg-purple-50:has-text("Generating Video...")')).toBeHidden({ timeout: 60000 }); // Adjust timeout based on conversion speed

      // Verify UI changes after images are "uploaded" / processed
      await expect(page.locator('h2')).toHaveText('Select one or more audio files');
      await expect(page.locator('button:has-text("Generate video")')).toBeVisible(); // New button text
    });

    // --- Step 5: Upload Audio Files ---
    await test.step('Upload audio files', async () => {
      // The same file input is likely reused, so target it again
      const fileInput = page.locator('#file-input');
      await fileInput.setInputFiles([audio1Path]);

      // Verify selected audio files display
      await expect(page.locator('.selected-files-display')).toContainText('audio1.mp3');
      await expect(page.locator('.selected-files-display li').nth(0)).toHaveText(/audio1.mp3/);
      await expect(page.locator('button:has-text("Generate video")')).not.toBeDisabled();
    });

    // --- Step 6: Click the "Generate video" button and handle download ---
    await test.step('Click "Generate video" and assert download', async () => {
      const generateButton = page.locator('button:has-text("Generate video")');

      // !!! IMPORTANT: Start waiting for the download BEFORE clicking the button !!!
      const [download] = await Promise.all([
        page.waitForEvent('download'), // Wait for the download event
        generateButton.click(),        // Click the button that triggers the download
      ]);

      // --- Step 7: Assertions on the downloaded file ---
      const downloadPath = await download.path(); // Get the temporary path where Playwright saved the file

      // Verify the download completed successfully
      expect(download.suggestedFilename()).toMatch(/\.mp4$/); // Check file extension
      expect(download.suggestedFilename()).toContain('output_'); // Or check for a specific prefix/name

      // Verify the file exists and is not empty
      expect(fs.existsSync(downloadPath)).toBeTruthy();
      const stats = fs.statSync(downloadPath);
      expect(stats.size).toBeGreaterThan(0); // Ensure the file has content

      console.log(`Downloaded file: ${download.suggestedFilename()} (Size: ${stats.size} bytes)`);

      // You can also read the file content if needed for more specific checks:
      // const fileContent = fs.readFileSync(downloadPath);
      // expect(fileContent.toString()).toContain('expected content'); // If it's a text file
      // If it's a video, you might check a header or just rely on size for basic validation.

      // Clean up the downloaded file if necessary (Playwright cleans temp files, but for custom paths you'd unlink)
      // download.delete(); // This explicitly deletes the temp file, often not needed as Playwright cleans up session files.
    });
  });
});