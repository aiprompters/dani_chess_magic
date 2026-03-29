import { VariantType } from '../types';
import { RuleEngine } from './RuleEngine';
import { StandardRules } from './StandardRules';
import { ForcedCaptureRules } from './ForcedCaptureRules';
import { DoubleMoveRules } from './DoubleMoveRules';
import { KingOfTheHillRules } from './KingOfTheHillRules';

export interface RuleEngineOptions {
  variant: VariantType;
  fen?: string;
  doubleMoveColor?: 'w' | 'b';
}

export function createRuleEngine(options: RuleEngineOptions = { variant: 'standard' }): RuleEngine {
  switch (options.variant) {
    case 'forcedCapture':
      return new ForcedCaptureRules(options.fen);
    case 'doubleMove':
      return new DoubleMoveRules(options.doubleMoveColor || 'b', options.fen);
    case 'kingOfTheHill':
      return new KingOfTheHillRules(options.fen);
    case 'standard':
    default:
      return new StandardRules(options.fen);
  }
}
