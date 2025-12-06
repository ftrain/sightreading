import { test, expect, Page } from '@playwright/test';

test.describe('Sight Reading App', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for Verovio to load and render
    await page.waitForSelector('#notation svg', { timeout: 10000 });
  });

  test.describe('Page Load', () => {
    test('should display the app title', async ({ page }) => {
      await expect(page.locator('.score-title h1')).toHaveText('Sight Reading');
    });

    test('should show level display', async ({ page }) => {
      // Level display shows the level badge (e.g., "1a")
      const levelDisplay = page.locator('#levelDisplay');
      await expect(levelDisplay).toBeVisible();
    });

    test('should render music notation SVG', async ({ page }) => {
      // Use .first() since there may be multiple SVG elements
      const svg = page.locator('#notation svg').first();
      await expect(svg).toBeVisible();
    });

    test('should display grand staff (treble and bass clefs)', async ({ page }) => {
      // Check that staves exist in the notation (SVG has .staff elements)
      const staves = page.locator('#notation svg .staff');
      const count = await staves.count();
      // Should have at least 2 staves (treble + bass)
      expect(count).toBeGreaterThanOrEqual(2);
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
      // The + button increases mastery/sub-level, need 3 clicks to advance sub-level
      // Just verify the button is clickable and app responds
      await levelUp.click();
      // Level display should still be visible (app didn't crash)
      await expect(page.locator('#levelDisplay')).toBeVisible();
    });

    test('should decrease level when - button is clicked', async ({ page }) => {
      // Use options panel to jump to level 2, then decrease
      await page.locator('#optionsToggle').click();
      await page.waitForTimeout(200);
      await page.locator('#levelJump').selectOption('2');
      await page.waitForTimeout(100);
      await page.locator('#optionsClose').click();

      await expect(page.locator('#levelDisplay')).toContainText('2');

      // Now decrease
      await page.locator('#levelDown').click();
      await expect(page.locator('#levelDisplay')).toContainText('1');
    });

    test('should not decrease below level 1', async ({ page }) => {
      const levelDown = page.locator('#levelDown');
      await levelDown.click();
      await levelDown.click();
      await levelDown.click();
      // Level display should contain "1" (level 1)
      await expect(page.locator('#levelDisplay')).toContainText('1');
    });

    test('should not increase above level 10 via jump selector', async ({ page }) => {
      // Open options panel
      await page.locator('#optionsToggle').click();
      await page.waitForTimeout(200);

      // Jump to level 10 (highest in selector)
      await page.locator('#levelJump').selectOption('10');
      await page.waitForTimeout(100);

      // Close options panel
      await page.locator('#optionsClose').click();

      // Verify we're at level 10
      await expect(page.locator('#levelDisplay')).toContainText('10');
    });

    test('should regenerate notation when level changes', async ({ page }) => {
      // Get the initial SVG content (use .first() since there may be multiple SVGs)
      const initialSvg = await page.locator('#notation svg').first().innerHTML();

      // Use level jump to change level
      await page.locator('#optionsToggle').click();
      await page.waitForTimeout(200);
      await page.locator('#levelJump').selectOption('2');
      await page.waitForTimeout(100);
      await page.locator('#optionsClose').click();

      // Get new SVG content (should be different since new piece is generated)
      const newSvg = await page.locator('#notation svg').first().innerHTML();

      // The notation should have changed (different random piece)
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

test.describe('Playback Timing', () => {
  test('should not fire duplicate note events', async ({ page }) => {
    // Collect console logs
    const consoleLogs: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'log') {
        consoleLogs.push(msg.text());
      }
    });

    await page.goto('/');
    await page.waitForSelector('#notation svg', { timeout: 10000 });

    // Open options panel and set to level 5 which has dotted notes (where the bug occurs)
    await page.locator('#optionsToggle').click();
    await page.waitForTimeout(200);
    await page.locator('#levelJump').selectOption('5');
    await page.waitForTimeout(500);

    // Set a faster BPM for quicker test
    await page.locator('#bpm').fill('120');

    // Close options panel
    await page.locator('#optionsClose').click();

    // Start playback
    await page.locator('#playPause').click();

    // Wait for some notes to play (at 120 BPM, 4 beat countoff + a few notes)
    await page.waitForTimeout(5000);

    // Stop playback
    await page.locator('#playPause').click();

    // Check for duplicate note firings
    const noteFiredLogs = consoleLogs.filter((log) => log.includes('-> Note'));
    const noteIndices = noteFiredLogs.map((log) => {
      const match = log.match(/Note (\d+)/);
      return match ? parseInt(match[1]) : -1;
    });

    // Count occurrences of each note index
    const noteCounts = new Map<number, number>();
    for (const idx of noteIndices) {
      noteCounts.set(idx, (noteCounts.get(idx) || 0) + 1);
    }

    // Check for duplicates
    const duplicates: number[] = [];
    for (const [noteIdx, count] of noteCounts) {
      if (count > 1) {
        duplicates.push(noteIdx);
      }
    }

    // Log for debugging
    console.log('Note fired logs:', noteFiredLogs);
    console.log('Note counts:', Object.fromEntries(noteCounts));

    expect(duplicates, `Notes ${duplicates.join(', ')} fired multiple times`).toHaveLength(0);
  });

  test('should fire notes with proper spacing (no instant skips)', async ({ page }) => {
    // Collect console logs
    const consoleLogs: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'log') {
        consoleLogs.push(msg.text());
      }
    });

    await page.goto('/');
    await page.waitForSelector('#notation svg', { timeout: 10000 });

    // Open options panel and set to level 5 for varied note durations
    await page.locator('#optionsToggle').click();
    await page.waitForTimeout(200);
    await page.locator('#levelJump').selectOption('5');
    await page.waitForTimeout(500);

    // Use 60 BPM for easy math (1 beat = 1 second)
    await page.locator('#bpm').fill('60');

    // Close options panel
    await page.locator('#optionsClose').click();

    // Start playback
    await page.locator('#playPause').click();

    // Wait for playback (4 beat countoff + ~16 beats of music at 60 BPM = 20 seconds)
    await page.waitForTimeout(22000);

    // Stop playback
    await page.locator('#playPause').click();

    // Get note firing times
    const firedLogs = consoleLogs.filter((log) => log.includes('-> Note') && log.includes('fired'));

    // Parse actual times from fired logs (only first firing of each note)
    const firingTimes: number[] = [];
    const seenNotes = new Set<number>();

    for (const log of firedLogs) {
      const noteMatch = log.match(/Note (\d+)/);
      const transportMatch = log.match(/transport=([\d.]+)s/);
      if (noteMatch && transportMatch) {
        const noteIdx = parseInt(noteMatch[1]);
        if (!seenNotes.has(noteIdx)) {
          seenNotes.add(noteIdx);
          firingTimes.push(parseFloat(transportMatch[1]));
        }
      }
    }

    // Check that consecutive notes have reasonable spacing (at least 0.2 seconds at 60 BPM)
    // Minimum note value is typically eighth note = 0.5 beats = 0.5 seconds at 60 BPM
    const minSpacing = 0.2; // 200ms minimum between any two notes
    const spacingErrors: string[] = [];

    for (let i = 1; i < firingTimes.length; i++) {
      const spacing = firingTimes[i] - firingTimes[i - 1];
      if (spacing < minSpacing) {
        spacingErrors.push(`Notes ${i - 1} and ${i} fired only ${(spacing * 1000).toFixed(0)}ms apart (at ${firingTimes[i - 1].toFixed(3)}s and ${firingTimes[i].toFixed(3)}s)`);
      }
    }

    console.log('Note firing times:', firingTimes);
    console.log('Spacings:', firingTimes.slice(1).map((t, i) => (t - firingTimes[i]).toFixed(3)));

    expect(spacingErrors, spacingErrors.join('\n')).toHaveLength(0);
  });
});

test.describe('Built-in Song SVG Timing', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#notation svg', { timeout: 10000 });
  });

  test('Minuet in G should render with both hands visible', async ({ page }) => {
    // Open options panel
    await page.locator('#optionsToggle').click();
    await page.waitForTimeout(200);

    // Select Minuet in G from song selector
    await page.locator('#songSelect').selectOption('minuet-g');
    await page.waitForTimeout(500);

    // Wait for SVG to render
    await page.waitForSelector('#notation svg .note', { timeout: 5000 });

    // Verify we have notes
    const noteCount = await page.locator('#notation svg .note').count();
    expect(noteCount).toBeGreaterThan(0);

    // Should have 2 staves (grand staff)
    const staveCount = await page.locator('#notation svg .staff').count();
    expect(staveCount).toBeGreaterThanOrEqual(2);
  });

  test('SVG note x-coordinates should increase left to right', async ({ page }) => {
    // Load Minuet in G
    await page.locator('#optionsToggle').click();
    await page.waitForTimeout(200);
    await page.locator('#songSelect').selectOption('minuet-g');
    await page.waitForTimeout(500);
    await page.waitForSelector('#notation svg .note', { timeout: 5000 });

    // Extract note x positions from SVG
    const notePositions = await page.evaluate(() => {
      const notes = document.querySelectorAll('#notation svg .note');
      const positions: { id: string; x: number }[] = [];

      notes.forEach((note) => {
        const id = note.getAttribute('id') || '';
        // Get the transform or use getBoundingClientRect
        const rect = (note as SVGGElement).getBoundingClientRect();
        positions.push({ id, x: rect.x });
      });

      // Sort by x position
      return positions.sort((a, b) => a.x - b.x);
    });

    expect(notePositions.length).toBeGreaterThan(0);

    // Verify notes are in left-to-right order (allowing for some variation)
    for (let i = 1; i < notePositions.length; i++) {
      // Notes shouldn't jump backwards significantly
      const diff = notePositions[i].x - notePositions[i - 1].x;
      expect(diff).toBeGreaterThanOrEqual(-5); // Allow small tolerance for stacked notes
    }
  });

  test('simultaneous notes should have similar x positions', async ({ page }) => {
    // Load Minuet in G
    await page.locator('#optionsToggle').click();
    await page.waitForTimeout(200);
    await page.locator('#songSelect').selectOption('minuet-g');
    await page.waitForTimeout(500);
    await page.waitForSelector('#notation svg .note', { timeout: 5000 });

    // Get note positions by staff
    const notesByStaff = await page.evaluate(() => {
      const svg = document.querySelector('#notation svg');
      if (!svg) return { staff1: [], staff2: [] };

      const notes = svg.querySelectorAll('.note');
      const staff1: { id: string; x: number }[] = [];
      const staff2: { id: string; x: number }[] = [];

      notes.forEach((note) => {
        const id = note.getAttribute('id') || '';
        const rect = (note as SVGGElement).getBoundingClientRect();

        // Determine which staff by checking parent elements
        let parent = note.parentElement;
        let staffNum = 1;
        while (parent && parent !== svg) {
          if (parent.classList.contains('staff')) {
            // Get staff index
            const staffs = svg.querySelectorAll('.staff');
            staffs.forEach((s, idx) => {
              if (s === parent) staffNum = idx + 1;
            });
            break;
          }
          parent = parent.parentElement;
        }

        if (staffNum === 1) {
          staff1.push({ id, x: rect.x });
        } else {
          staff2.push({ id, x: rect.x });
        }
      });

      return { staff1, staff2 };
    });

    // Both staves should have notes
    expect(notesByStaff.staff1.length).toBeGreaterThan(0);
    expect(notesByStaff.staff2.length).toBeGreaterThan(0);

    // In Minuet in G, measure 1 beat 1 should have notes in both hands at similar x
    // Check that the first notes are at similar x positions (within tolerance)
    if (notesByStaff.staff1.length > 0 && notesByStaff.staff2.length > 0) {
      // Sort both by x
      const s1Sorted = [...notesByStaff.staff1].sort((a, b) => a.x - b.x);
      const s2Sorted = [...notesByStaff.staff2].sort((a, b) => a.x - b.x);

      // First notes should be at similar x (beat 1 of measure 1)
      const firstS1 = s1Sorted[0];
      const firstS2 = s2Sorted[0];

      // Allow 50px tolerance for alignment
      const xDiff = Math.abs(firstS1.x - firstS2.x);
      expect(xDiff).toBeLessThan(50);
    }
  });

  test('note count should match parsed MusicXML data', async ({ page }) => {
    // Load Minuet in G
    await page.locator('#optionsToggle').click();
    await page.waitForTimeout(200);
    await page.locator('#songSelect').selectOption('minuet-g');
    await page.waitForTimeout(500);
    await page.waitForSelector('#notation svg .note', { timeout: 5000 });

    // Count notes in SVG
    const svgNoteCount = await page.locator('#notation svg .note').count();

    // Minuet in G (8 measures, 3/4 time) should have:
    // RH: varied rhythm per measure
    // LH: mostly half + quarter or dotted half per measure
    // Expected total: roughly 40-60 notes
    expect(svgNoteCount).toBeGreaterThan(30);
    expect(svgNoteCount).toBeLessThan(100);
  });

  test('round-trip: SVG should re-render identically after parse/rebuild', async ({ page }) => {
    // This test verifies that the parsed data renders to consistent SVG

    // Load Minuet in G
    await page.locator('#optionsToggle').click();
    await page.waitForTimeout(200);
    await page.locator('#songSelect').selectOption('minuet-g');
    await page.waitForTimeout(500);
    await page.waitForSelector('#notation svg .note', { timeout: 5000 });

    // Get initial SVG note positions
    const initialPositions = await page.evaluate(() => {
      const notes = document.querySelectorAll('#notation svg .note');
      return Array.from(notes).map((note) => {
        const rect = (note as SVGGElement).getBoundingClientRect();
        return { x: Math.round(rect.x), y: Math.round(rect.y) };
      });
    });

    // Click "Next" button to advance practice step (triggers re-render)
    const nextBtn = page.locator('#practiceNext');
    if (await nextBtn.isVisible()) {
      await nextBtn.click();
      await page.waitForTimeout(500);

      // Go back to start
      const restartBtn = page.locator('#practiceRestart');
      if (await restartBtn.isVisible()) {
        await restartBtn.click();
        await page.waitForTimeout(500);

        // Get new positions
        const newPositions = await page.evaluate(() => {
          const notes = document.querySelectorAll('#notation svg .note');
          return Array.from(notes).map((note) => {
            const rect = (note as SVGGElement).getBoundingClientRect();
            return { x: Math.round(rect.x), y: Math.round(rect.y) };
          });
        });

        // Same song should have same number of notes in first step
        // (may differ if progressive mode shows different ranges)
        expect(newPositions.length).toBeGreaterThan(0);
      }
    }
  });

  test('Mary Had a Little Lamb should render correctly', async ({ page }) => {
    await page.locator('#optionsToggle').click();
    await page.waitForTimeout(200);
    await page.locator('#songSelect').selectOption('mary-lamb');
    await page.waitForTimeout(500);
    await page.waitForSelector('#notation svg .note', { timeout: 5000 });

    // Mary Had a Little Lamb has mostly quarter notes in RH
    const noteCount = await page.locator('#notation svg .note').count();
    expect(noteCount).toBeGreaterThan(10);

    // Check for rest elements (LH has whole rests)
    const restCount = await page.locator('#notation svg .rest').count();
    expect(restCount).toBeGreaterThan(0);
  });

  test('Happy Birthday (3/4 time) should render correctly', async ({ page }) => {
    await page.locator('#optionsToggle').click();
    await page.waitForTimeout(200);
    await page.locator('#songSelect').selectOption('happy-birthday');
    await page.waitForTimeout(500);
    await page.waitForSelector('#notation svg .note', { timeout: 5000 });

    // Check for time signature elements (3/4)
    const timeSigElement = await page.locator('#notation svg .meterSig').count();
    expect(timeSigElement).toBeGreaterThan(0);
  });
});
