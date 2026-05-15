import { describe, it, expect } from 'vitest';
import { RISK_MODEL_VERSION } from '../src/services/risk.service.js';

describe('risk model', () => {
  it('has a versioned identifier', () => {
    expect(RISK_MODEL_VERSION).toMatch(/^rule-v\d+\.\d+\.\d+$/);
  });
});
