import { useContext } from 'react';
import {
  NarrativeControllerContext,
  type NarrativeControllerApi,
} from './narrativeControllerContext';

export function useNarrativeController(): NarrativeControllerApi {
  const context = useContext(NarrativeControllerContext);

  if (!context) {
    throw new Error('useNarrativeController must be used inside NarrativeController');
  }

  return context;
}
