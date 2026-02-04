import { describe, it, expect } from 'vitest';
import {
  isVeryLikelyProductive,
  alwaysProductiveSites,
  alwaysProductiveOwners,
} from '../distractionRules';

describe('Distraction Rules', () => {
  describe('alwaysProductiveSites', () => {
    it('should contain expected productive sites', () => {
      expect(alwaysProductiveSites).toContain('cursor.com');
      expect(alwaysProductiveSites).toContain('figma.com');
      expect(alwaysProductiveSites).toContain(
        'us-east-1.console.aws.amazon.com',
      );
    });

    it('should be a non-empty array', () => {
      expect(alwaysProductiveSites.length).toBeGreaterThan(0);
    });
  });

  describe('alwaysProductiveOwners', () => {
    it('should contain expected productive app owners', () => {
      expect(alwaysProductiveOwners).toContain('Cursor');
      expect(alwaysProductiveOwners).toContain('Toggl Track');
      expect(alwaysProductiveOwners).toContain('MongoDB Compass');
      expect(alwaysProductiveOwners).toContain('Postman');
      expect(alwaysProductiveOwners).toContain('1Password');
      expect(alwaysProductiveOwners).toContain('Electron');
    });

    it('should be a non-empty array', () => {
      expect(alwaysProductiveOwners.length).toBeGreaterThan(0);
    });
  });

  describe('isVeryLikelyProductive', () => {
    it('should return true for a productive site URL', () => {
      const result = isVeryLikelyProductive({
        ownerName: 'Chrome',
        type: 'browser',
        url: 'cursor.com',
        timestamp: Date.now(),
      });
      expect(result).toBe(true);
    });

    it('should return true for a productive app owner', () => {
      const result = isVeryLikelyProductive({
        ownerName: 'Cursor',
        type: 'window',
        timestamp: Date.now(),
      });
      expect(result).toBe(true);
    });

    it('should return true for Toggl Track', () => {
      const result = isVeryLikelyProductive({
        ownerName: 'Toggl Track',
        type: 'window',
        timestamp: Date.now(),
      });
      expect(result).toBe(true);
    });

    it('should return true for Postman', () => {
      const result = isVeryLikelyProductive({
        ownerName: 'Postman',
        type: 'window',
        timestamp: Date.now(),
      });
      expect(result).toBe(true);
    });

    it('should return false for a non-productive app', () => {
      const result = isVeryLikelyProductive({
        ownerName: 'Netflix',
        type: 'window',
        timestamp: Date.now(),
      });
      expect(result).toBe(false);
    });

    it('should return false for a non-productive URL', () => {
      const result = isVeryLikelyProductive({
        ownerName: 'Chrome',
        type: 'browser',
        url: 'youtube.com',
        timestamp: Date.now(),
      });
      expect(result).toBe(false);
    });

    it('should return false when URL is null/undefined', () => {
      const result = isVeryLikelyProductive({
        ownerName: 'Chrome',
        type: 'browser',
        url: null,
        timestamp: Date.now(),
      });
      expect(result).toBe(false);
    });

    it('should return false for an unknown app with no URL', () => {
      const result = isVeryLikelyProductive({
        ownerName: 'SomeRandomApp',
        type: 'window',
        timestamp: Date.now(),
      });
      expect(result).toBe(false);
    });

    it('should handle Figma site correctly', () => {
      const result = isVeryLikelyProductive({
        ownerName: 'Chrome',
        type: 'browser',
        url: 'figma.com',
        timestamp: Date.now(),
      });
      expect(result).toBe(true);
    });

    it('should handle AWS console correctly', () => {
      const result = isVeryLikelyProductive({
        ownerName: 'Chrome',
        type: 'browser',
        url: 'us-east-1.console.aws.amazon.com',
        timestamp: Date.now(),
      });
      expect(result).toBe(true);
    });
  });
});
