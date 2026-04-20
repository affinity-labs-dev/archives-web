import React, { Children, isValidElement } from 'react';
import type { ReactElement, ReactNode } from 'react';

import { AnimatedEntrance, type AnimatedEntranceProps } from './AnimatedEntrance';
import type { EntranceConfig, EntrancePresetKey } from './presets';

export interface StaggerGroupProps {
  /** Entrance preset applied to each child. */
  preset: EntrancePresetKey | EntranceConfig;

  /** Delay before the first child starts, ms. Default `0`. */
  baseDelay?: number;

  /** Additional delay per child index, ms. Default `80`. */
  staggerInterval?: number;

  /** Play entrance on mount. Default `true`. */
  autoPlay?: boolean;

  /** Change this value to replay the entrance group. */
  replayKey?: number | string;

  /**
   * Children to stagger. Each child is wrapped in an AnimatedEntrance.
   * Non-element children (strings, null) pass through unchanged.
   */
  children: ReactNode;
}

/**
 * StaggerGroup — wraps each child in an AnimatedEntrance with a compounded delay.
 *
 * @example
 * <StaggerGroup preset="slideFromRight" baseDelay={200} staggerInterval={80}>
 *   {options.map(opt => <OptionRow key={opt.id} {...opt} />)}
 * </StaggerGroup>
 */
export function StaggerGroup({
  preset,
  baseDelay = 0,
  staggerInterval = 80,
  autoPlay = true,
  replayKey,
  children,
}: StaggerGroupProps) {
  const childArray = Children.toArray(children);
  let elementIndex = 0;

  return (
    <>
      {childArray.map((child, i) => {
        if (!isValidElement(child)) return child;

        const thisIndex = elementIndex++;
        const entranceProps: AnimatedEntranceProps = {
          preset,
          delay: baseDelay + thisIndex * staggerInterval,
          autoPlay,
          replayKey,
          children: child,
        };

        return <AnimatedEntrance key={(child as ReactElement).key ?? i} {...entranceProps} />;
      })}
    </>
  );
}
