// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import React, { useState } from 'react';
import { Stack, PrimaryButton, Image, Text } from '@fluentui/react';

import heroSVG from '../../assets/hero.svg';
import {
  imgStyle,
  infoContainerStyle,
  configContainerStyle,
  configContainerStackTokens,
  containerStyle,
  containerTokens,
  headerStyle,
  buttonStyle
} from '../styles/HomeScreen.styles';

import { ThemeSelector } from '../theming/ThemeSelector';
import { localStorageAvailable } from '../utils/localStorage';
import { getDisplayNameFromLocalStorage, saveDisplayNameToLocalStorage } from '../utils/localStorage';
import { DisplayNameField } from './DisplayNameField';

export interface HomeScreenProps {
  startCallHandler(callDetails: { displayName: string }): void;
}

export const HomeScreen = (props: HomeScreenProps): JSX.Element => {
  const imageProps = { src: heroSVG.toString() };
  const headerTitle = 'Start a call';

  // Get display name from local storage if available
  const defaultDisplayName = localStorageAvailable ? getDisplayNameFromLocalStorage() : null;
  const [displayName, setDisplayName] = useState<string | undefined>(defaultDisplayName ?? undefined);
  const buttonEnabled = !!displayName;

  return (
    <Stack
      horizontal
      wrap
      horizontalAlign="center"
      verticalAlign="center"
      tokens={containerTokens}
      className={containerStyle}
    >
      <Image alt="Welcome to the ACS Sample app" className={imgStyle} {...imageProps} />
      <Stack className={infoContainerStyle}>
        <Text role={'heading'} aria-level={1} className={headerStyle}>
          {headerTitle}
        </Text>
        <Stack className={configContainerStyle} tokens={configContainerStackTokens}>
          <DisplayNameField defaultName={displayName} setName={setDisplayName} />
          <PrimaryButton
            disabled={!buttonEnabled}
            className={buttonStyle}
            text="Next"
            onClick={() => {
              if (displayName) {
                displayName && saveDisplayNameToLocalStorage(displayName);

                props.startCallHandler({ displayName });
              }
            }}
          />

          <div>
            <ThemeSelector label="Theme" horizontal={true} />
          </div>
        </Stack>
      </Stack>
    </Stack>
  );
};
