import React from 'react';

import {
  Platform,
} from 'react-native';

// 3rd party libraries
import { Actions, Router, Scene } from 'react-native-router-flux';
import DeviceInfo from 'react-native-device-info';
import GoogleAnalytics from 'react-native-google-analytics-bridge';
// import store from 'react-native-simple-store';

// Views
import MainView from './app/main';
import InfoView from './app/info';
import LanguageSelectView from './app/language-select';

import { config } from './config';

GoogleAnalytics.setTrackerId(config.googleAnalytics[Platform.OS]);

if (DeviceInfo.getDeviceName() === 'iPhone Simulator' || DeviceInfo.getDeviceName() === 'apple’s MacBook Pro' || DeviceInfo.getManufacturer() === 'Genymotion') {
  console.log('GoogleAnalytics setDryRun');
  GoogleAnalytics.setDryRun(true);
}

const scenes = Actions.create(
  <Scene key="root">
    <Scene key="main" component={MainView} hideNavBar={true} initial={true} />
    <Scene key="info" title={'Info'} component={InfoView} direction="vertical" panHandlers={null} />
    <Scene key="languageSelect" title={'Select Language'} component={LanguageSelectView} />
  </Scene>
);

const Cognitive = function Cognitive() {
  return <Router scenes={scenes} />;
};

export default Cognitive;
