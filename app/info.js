import React, { Component } from 'react';
import {
  Linking,
  Platform,
  StyleSheet,
  ScrollView,
  View,
} from 'react-native';

// 3rd party libraries
import { Actions } from 'react-native-router-flux';
import { Cell, Section, TableView } from 'react-native-tableview-simple';
import DeviceInfo from 'react-native-device-info';
import GoogleAnalytics from 'react-native-google-analytics-bridge';
import Icon from 'react-native-vector-icons/Ionicons';
import NavigationBar from 'react-native-navbar';
import Share from 'react-native-share';
import { List, ListItem } from 'react-native-elements'

// Component
import AdmobCell from './admob';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#EFEFF4',
  },
  navigatorBarIOS: {
    backgroundColor: '#212121',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#424242',
  },
  navigatorLeftButton: {
    paddingTop: 10,
    paddingLeft: 10,
    paddingRight: 50,
  },
  navigatorRightButton: {
    paddingTop: 10,
    paddingLeft: 50,
    paddingRight: 10,
  },
  toolbar: {
    height: 56,
    backgroundColor: '#0A0A0A',
    elevation: 10,
  },
  text: {
    flex: 1,
    fontSize: 16,
  },
});

const languages = [
  {
    language: 'af',
    name: 'Afrikaans',
  },
  {
    language: 'sq',
    name: 'Albanian',
  },
  {
    language: 'am',
    name: 'Amharic',
  },
  {
    language: 'ar',
    name: 'Arabic',
  },
  {
    language: 'hy',
    name: 'Armenian',
  },
  {
    language: 'az',
    name: 'Azerbaijani',
  },
  {
    language: 'eu',
    name: 'Basque',
  },
  {
    language: 'be',
    name: 'Belarusian',
  },
  {
    language: 'bn',
    name: 'Bengali',
  },
  {
    language: 'bs',
    name: 'Bosnian',
  },
  {
    language: 'bg',
    name: 'Bulgarian',
  },
  {
    language: 'ca',
    name: 'Catalan',
  },
  {
    language: 'ceb',
    name: 'Cebuano',
  },
  {
    language: 'ny',
    name: 'Chichewa',
  },
  {
    language: 'zh',
    name: 'Chinese (Simplified)',
  },
  {
    language: 'zh-TW',
    name: 'Chinese (Traditional)',
  },
  {
    language: 'co',
    name: 'Corsican',
  },
  {
    language: 'hr',
    name: 'Croatian',
  },
  {
    language: 'cs',
    name: 'Czech',
  },
  {
    language: 'da',
    name: 'Danish',
  },
  {
    language: 'nl',
    name: 'Dutch',
  },
  {
    language: 'en',
    name: 'English',
  },
  {
    language: 'eo',
    name: 'Esperanto',
  },
  {
    language: 'et',
    name: 'Estonian',
  },
  {
    language: 'tl',
    name: 'Filipino',
  },
  {
    language: 'fi',
    name: 'Finnish',
  },
  {
    language: 'fr',
    name: 'French',
  },
  {
    language: 'fy',
    name: 'Frisian',
  },
  {
    language: 'gl',
    name: 'Galician',
  },
  {
    language: 'ka',
    name: 'Georgian',
  },
  {
    language: 'de',
    name: 'German',
  },
  {
    language: 'el',
    name: 'Greek',
  },
  {
    language: 'gu',
    name: 'Gujarati',
  },
  {
    language: 'ht',
    name: 'Haitian Creole',
  },
  {
    language: 'ha',
    name: 'Hausa',
  },
  {
    language: 'haw',
    name: 'Hawaiian',
  },
  {
    language: 'iw',
    name: 'Hebrew',
  },
  {
    language: 'hi',
    name: 'Hindi',
  },
  {
    language: 'hmn',
    name: 'Hmong',
  },
  {
    language: 'hu',
    name: 'Hungarian',
  },
  {
    language: 'is',
    name: 'Icelandic',
  },
  {
    language: 'ig',
    name: 'Igbo',
  },
  {
    language: 'id',
    name: 'Indonesian',
  },
  {
    language: 'ga',
    name: 'Irish',
  },
  {
    language: 'it',
    name: 'Italian',
  },
  {
    language: 'ja',
    name: 'Japanese',
  },
  {
    language: 'jw',
    name: 'Javanese',
  },
  {
    language: 'kn',
    name: 'Kannada',
  },
  {
    language: 'kk',
    name: 'Kazakh',
  },
  {
    language: 'km',
    name: 'Khmer',
  },
  {
    language: 'ko',
    name: 'Korean',
  },
  {
    language: 'ku',
    name: 'Kurdish (Kurmanji)',
  },
  {
    language: 'ky',
    name: 'Kyrgyz',
  },
  {
    language: 'lo',
    name: 'Lao',
  },
  {
    language: 'la',
    name: 'Latin',
  },
  {
    language: 'lv',
    name: 'Latvian',
  },
  {
    language: 'lt',
    name: 'Lithuanian',
  },
  {
    language: 'lb',
    name: 'Luxembourgish',
  },
  {
    language: 'mk',
    name: 'Macedonian',
  },
  {
    language: 'mg',
    name: 'Malagasy',
  },
  {
    language: 'ms',
    name: 'Malay',
  },
  {
    language: 'ml',
    name: 'Malayalam',
  },
  {
    language: 'mt',
    name: 'Maltese',
  },
  {
    language: 'mi',
    name: 'Maori',
  },
  {
    language: 'mr',
    name: 'Marathi',
  },
  {
    language: 'mn',
    name: 'Mongolian',
  },
  {
    language: 'my',
    name: 'Myanmar (Burmese)',
  },
  {
    language: 'ne',
    name: 'Nepali',
  },
  {
    language: 'no',
    name: 'Norwegian',
  },
  {
    language: 'ps',
    name: 'Pashto',
  },
  {
    language: 'fa',
    name: 'Persian',
  },
  {
    language: 'pl',
    name: 'Polish',
  },
  {
    language: 'pt',
    name: 'Portuguese',
  },
  {
    language: 'pa',
    name: 'Punjabi',
  },
  {
    language: 'ro',
    name: 'Romanian',
  },
  {
    language: 'ru',
    name: 'Russian',
  },
  {
    language: 'sm',
    name: 'Samoan',
  },
  {
    language: 'gd',
    name: 'Scots Gaelic',
  },
  {
    language: 'sr',
    name: 'Serbian',
  },
  {
    language: 'st',
    name: 'Sesotho',
  },
  {
    language: 'sn',
    name: 'Shona',
  },
  {
    language: 'sd',
    name: 'Sindhi',
  },
  {
    language: 'si',
    name: 'Sinhala',
  },
  {
    language: 'sk',
    name: 'Slovak',
  },
  {
    language: 'sl',
    name: 'Slovenian',
  },
  {
    language: 'so',
    name: 'Somali',
  },
  {
    language: 'es',
    name: 'Spanish',
  },
  {
    language: 'su',
    name: 'Sundanese',
  },
  {
    language: 'sw',
    name: 'Swahili',
  },
  {
    language: 'sv',
    name: 'Swedish',
  },
  {
    language: 'tg',
    name: 'Tajik',
  },
  {
    language: 'ta',
    name: 'Tamil',
  },
  {
    language: 'te',
    name: 'Telugu',
  },
  {
    language: 'th',
    name: 'Thai',
  },
  {
    language: 'tr',
    name: 'Turkish',
  },
  {
    language: 'uk',
    name: 'Ukrainian',
  },
  {
    language: 'ur',
    name: 'Urdu',
  },
  {
    language: 'uz',
    name: 'Uzbek',
  },
  {
    language: 'vi',
    name: 'Vietnamese',
  },
  {
    language: 'cy',
    name: 'Welsh',
  },
  {
    language: 'xh',
    name: 'Xhosa',
  },
  {
    language: 'yi',
    name: 'Yiddish',
  },
  {
    language: 'yo',
    name: 'Yoruba',
  },
  {
    language: 'zu',
    name: 'Zulu',
  },
];

export default class InfoView extends Component {
  onShareApp() {
    Share.open({
      title: 'Vision help',
      message: 'Vision help - Help people see the world.',
      url: 'http://onelink.to/hteg6t',
    }, (e) => {
      console.log(e);
    });
  }

  renderToolbar() {
    if (Platform.OS === 'ios') {
      return (
        <NavigationBar
          statusBar={{ tintColor: '#212121', style: 'light-content' }}
          style={styles.navigatorBarIOS}
          title={{ title: this.props.title, tintColor: '#F5F5F5' }}
          rightButton={{
            title: 'Close',
            tintColor: '#69BBFF',
            handler: Actions.pop,
          }}
        />
      );
    } else if (Platform.OS === 'android') {
      return (
        <Icon.ToolbarAndroid
          style={styles.toolbar}
          title={this.props.title}
          titleColor="white"
          navIconName="md-arrow-back"
          onIconClicked={Actions.pop}
        />
      );
    }
  }

  render() {
    GoogleAnalytics.trackScreenView('info');
    return (
      <View style={styles.container}>
        {this.renderToolbar()}
        <ScrollView>
          <TableView>
            <Section header={'Info'}>
              <Cell
                cellStyle="RightDetail"
                title={'Version'}
                detail={`${DeviceInfo.getReadableVersion()}`}
              />
              <Cell
                cellStyle="Basic"
                title={'Language Settings'}
                onPress={() => {
                  Actions.languageSelect();
                  GoogleAnalytics.trackEvent('user-action', 'language-setting');
                }}
              />
              <Cell
                cellStyle="Basic"
                title={'Feedback'}
                onPress={() => {
                  this.onShareApp();
                  GoogleAnalytics.trackEvent('user-action', 'feedback');
                }}
              />
              <Cell
                cellStyle="Basic"
                title={'Share this cool app!'}
                onPress={() => {
                  this.onShareApp();
                  GoogleAnalytics.trackEvent('user-action', 'share-app');
                }}
              />
              <Cell
                cellStyle="Basic"
                title={'Rate us'}
                onPress={() => {
                  if (Platform.OS === 'ios') {
                    Linking.openURL('itms-apps://itunes.apple.com/app/id1134904047');
                  } else if (Platform.OS === 'android') {
                    Linking.openURL('market://details?id=com.kfpun.cognitive');
                  }
                  GoogleAnalytics.trackEvent('user-action', 'open-url', { label: 'rate-us' });
                }}
              />
            </Section>

            <Section header={'Others'}>
              <Cell
                cellStyle="Basic"
                title={'View more by this developer'}
                onPress={() => {
                  if (Platform.OS === 'ios') {
                    Linking.openURL('https://itunes.apple.com/us/developer/kf-pun/id1116896894');
                  } else if (Platform.OS === 'android') {
                    Linking.openURL('https://play.google.com/store/apps/developer?id=Kf');
                  }
                  GoogleAnalytics.trackEvent('user-action', 'open-url', { label: 'more-by-developer' });
                }}
              />
            </Section>
          </TableView>

          <AdmobCell bannerSize="mediumRectangle" />
        </ScrollView>
      </View>
    );
  }
}

InfoView.propTypes = {
  title: React.PropTypes.string,
};

InfoView.defaultProps = {
  title: '',
};
