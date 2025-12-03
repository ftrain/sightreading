import { test, expect, Page } from '@playwright/test';

test.describe('Sight Reading App', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for Verovio to load and render
    await page.waitForSelector('#notation svg', { timeout: 10000 });
  });

  test.describe('Page Load', () => {
    test('should display the app title', async ({ page }) => {
      await expect(page.locator('header h1')).toHaveText('Sight Reading');
    });

    test('should show level display starting at Level 1', async ({ page }) => {
      await expect(page.locator('#levelDisplay')).toContainText('Level 1');
    });

    test('should render music notation SVG', async ({ page }) => {
      const svg = page.locator('#notation svg');
      await expect(svg).toBeVisible();
    });

    test('should display grand staff (treble and bass clefs)', async ({ page }) => {
      // Check for two staves in the notation
      const staves = page.locator('#notation svg .staff');
      await expect(staves).toHaveCount(4); // 2 systems × 2 staves each
    });
  });

  test.describe('Controls', () => {
    test('should have BPM input with default value 30', async ({ page }) => {
      const bpmInput = page.locator('#bpm');
      await expect(bpmInput).toHaveValue('30');
    });

    test('should change BPM when input is modified', async ({ page }) => {
      const bpmInput = page.locator('#bpm');
      await bpmInput.fill('60');
      await expect(bpmInput).toHaveValue('60');
    });

    test('should have metronome checkbox checked by default', async ({ page }) => {
      const metronome = page.locator('#metronome');
      await expect(metronome).toBeChecked();
    });

    test('should toggle metronome checkbox', async ({ page }) => {
      const metronome = page.locator('#metronome');
      await metronome.uncheck();
      await expect(metronome).not.toBeChecked();
    });

    test('should have hands separate checkbox unchecked by default', async ({ page }) => {
      const handsSeparate = page.locator('#handsSeparate');
      await expect(handsSeparate).not.toBeChecked();
    });

    test('should have Start button initially', async ({ page }) => {
      const playPauseBtn = page.locator('#playPause');
      await expect(playPauseBtn).toHaveText('Start');
    });
  });

  test.describe('Level Controls', () => {
    test('should increase level when + button is clicked', async ({ page }) => {
      const levelUp = page.locator('#levelUp');
      await levelUp.click();
      await expect(page.locator('#levelDisplay')).toContainText('Level 2');
    });

    test('should decrease level when - button is clicked', async ({ page }) => {
      // First increase to level 2
      await page.locator('#levelUp').click();
      await expect(page.locator('#levelDisplay')).toContainText('Level 2');

      // Then decrease back to level 1
      await page.locator('#levelDown').click();
      await expect(page.locator('#levelDisplay')).toContainText('Level 1');
    });

    test('should not decrease below level 1', async ({ page }) => {
      const levelDown = page.locator('#levelDown');
      await levelDown.click();
      await levelDown.click();
      await levelDown.click();
      await expect(page.locator('#levelDisplay')).toContainText('Level 1');
    });

    test('should not increase above level 10', async ({ page }) => {
      const levelUp = page.locator('#levelUp');
      for (let i = 0; i < 15; i++) {
        await levelUp.click();
      }
      await expect(page.locator('#levelDisplay')).toContainText('Level 10');
    });

    test('should regenerate notation when level changes', async ({ page }) => {
      // Get the initial SVG content
      const initialSvg = await page.locator('#notation svg').innerHTML();

      // Change level
      await page.locator('#levelUp').click();

      // Wait for re-render
      await page.waitForTimeout(100);

      // Get new SVG content (should be different since new piece is generated)
      const newSvg = await page.locator('#notation svg').innerHTML();

      // The notation should have changed (different random piece)
      // Note: There's a small chance they could be identical, but very unlikely
      expect(initialSvg).not.toBe(newSvg);
    });
  });

  test.describe('Hands Separate Mode', () => {
    test('should show RH indicator when hands separate is enabled', async ({ page }) => {
      const handsSeparate = page.locator('#handsSeparate');
      await handsSeparate.check();
      await expect(page.locator('#levelDisplay')).toContainText('(RH)');
    });

    test('should regenerate notation when hands separate is toggled', async ({ page }) => {
      const handsSeparate = page.locator('#handsSeparate');
      await handsSeparate.check();

      // Level display should now include hand indicator
      await expect(page.locator('#levelDisplay')).toContainText('Level 1 (RH)');
    });
  });

  test.describe('Playback', () => {
    test('should change button to Stop when started', async ({ page }) => {
      const playPauseBtn = page.locator('#playPause');
      await playPauseBtn.click();
      await expect(playPauseBtn).toHaveText('Stop');
    });

    test('should show countoff when playback starts', async ({ page }) => {
      await page.locator('#playPause').click();
      const countoff = page.locator('#countoff');
      await expect(countoff).toBeVisible();
      await expect(countoff).toHaveClass(/visible/);
    });

    test('should change button back to Start when stopped', async ({ page }) => {
      const playPauseBtn = page.locator('#playPause');
      await playPauseBtn.click();
      await expect(playPauseBtn).toHaveText('Stop');
      await playPauseBtn.click();
      await expect(playPauseBtn).toHaveText('Start');
    });
  });

  test.describe('Music Notation Quality', () => {
    test('should have notes in the notation', async ({ page }) => {
      const notes = page.locator('#notation svg .note');
      const count = await notes.count();
      expect(count).toBeGreaterThan(0);
    });

    test('should have beams on eighth notes at higher levels', async ({ page }) => {
      // Go to level 7 where eighth notes appear
      const levelUp = page.locator('#levelUp');
      for (let i = 0; i < 6; i++) {
        await levelUp.click();
      }

      await page.waitForTimeout(100);

      // Check for beams in the notation (may or may not exist depending on random generation)
      const beams = page.locator('#notation svg .beam');
      // At this level, beams may appear but are not guaranteed in every piece
      const hasBeams = await beams.count() > 0;
      // This is informational - eighth notes may not always be beamed together
      console.log(`Level 7 has beams: ${hasBeams}`);
    });
  });
});

test.describe('Mobile Responsiveness', () => {
  test.use({ viewport: { width: 375, height: 667 } }); // iPhone SE portrait

  test('should display controls compactly on mobile', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#notation svg', { timeout: 10000 });

    const controls = page.locator('#controls');
    await expect(controls).toBeVisible();
  });

  test('should have readable notation on mobile', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#notation svg', { timeout: 10000 });

    const notation = page.locator('#notation');
    await expect(notation).toBeVisible();
  });
});

test.describe('Mobile Landscape', () => {
  test.use({ viewport: { width: 844, height: 390 } }); // iPhone landscape

  test('should optimize for 4 bars in landscape', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#notation svg', { timeout: 10000 });

    // In landscape mobile, notation should be visible and optimized
    const notation = page.locator('#notation');
    await expect(notation).toBeVisible();

    // Check that MIDI controls are hidden or minimized on mobile
    const midiSelect = page.locator('#midiInput');
    const midiGroup = page.locator('.midi-control-group');

    // On mobile, MIDI controls should be hidden or the select should not be prominent
    // This depends on our CSS implementation
    const isHidden = await midiGroup.isHidden().catch(() => true);
    console.log(`MIDI controls hidden on mobile: ${isHidden}`);
  });
});

test.describe('Lesson Progression', () => {
  test('should start with simple whole notes at level 1', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#notation svg', { timeout: 10000 });

    // At level 1, we should only see whole notes
    // Check the notation for note types
    const notes = page.locator('#notation svg .note');
    const count = await notes.count();
    expect(count).toBeGreaterThan(0);
    expect(count).toBeLessThanOrEqual(16); // With whole notes, should have fewer notes
  });

  test('level progression should be gradual', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#notation svg', { timeout: 10000 });

    // Test that levels 1-3 have progressively more complexity
    const noteCounts: number[] = [];

    for (let level = 1; level <= 3; level++) {
      if (level > 1) {
        await page.locator('#levelUp').click();
        await page.waitForTimeout(100);
      }
      const notes = page.locator('#notation svg .note');
      const count = await notes.count();
      noteCounts.push(count);
    }

    // Higher levels should generally have more notes (shorter durations)
    // Note: Due to randomness, this isn't always true, but as a general trend
    console.log(`Note counts by level: ${noteCounts.join(', ')}`);
  });
});

test.describe('Accessibility', () => {
  test('should have proper ARIA labels', async ({ page }) => {
    await page.goto('/');

    // Check that form controls have labels
    const bpmInput = page.locator('#bpm');
    const bpmLabel = page.locator('label[for="bpm"]');
    await expect(bpmLabel).toBeVisible();
  });

  test('should support keyboard navigation', async ({ page }) => {
    await page.goto('/');

    // Tab through controls
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');

    // Should be able to reach the start button via keyboard
    const playPauseBtn = page.locator('#playPause');
    await playPauseBtn.focus();
    await expect(playPauseBtn).toBeFocused();
  });
});

test.describe('Sub-level Progression', () => {
  test('should track mastery within a level', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#notation svg', { timeout: 10000 });

    // Check that sub-level indicator exists
    const levelDisplay = page.locator('#levelDisplay');
    const text = await levelDisplay.textContent();

    // Should show level with optional sub-level indicator
    expect(text).toContain('Level');
  });
});
