import {
  AppRegistry,
  StatusBar,
} from 'react-native';
import Cognitive from './Cognitive';

StatusBar.setBarStyle('light-content', true);
AppRegistry.registerComponent('Cognitive', () => Cognitive);
