import React from 'react';
import {
  Alert,
  CameraRoll,
  Dimensions,
  Image,
  ListView,
  Platform,
  StyleSheet,
  Text,
  TouchableHighlight,
  View,
} from 'react-native';

// Components
import AdmobCell from './app/admob';

// 3rd party libraries
import { RNS3 } from 'react-native-aws3';
import * as Animatable from 'react-native-animatable';
import DeviceInfo from 'react-native-device-info';
import Icon from 'react-native-vector-icons/MaterialIcons';
import ImageResizer from 'react-native-image-resizer';
import Permissions from 'react-native-permissions';
import Spinner from 'react-native-spinkit';
import timer from 'react-native-timer';
import GoogleAnalytics from 'react-native-google-analytics-bridge';

import { config } from './config';

GoogleAnalytics.setTrackerId(config.googleAnalytics.ios);

import firebase from 'firebase';
firebase.initializeApp(config.firebase);

const { width } = Dimensions.get('window');
const uniqueID = DeviceInfo.getUniqueID();

let OFFSETY;
const THRESHOLD = Platform.OS === 'ios' ? 50 : 20;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  body: {
    flex: 4,
    backgroundColor: 'black',
  },
  image: {
    width,
    resizeMode: 'stretch',
  },
  slideContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  footer: {
    flex: 1,
    flexDirection: 'column',
    backgroundColor: '#37474F',
  },
  cowBlock: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  flagBlock: {
    position: 'absolute',
    right: 0,
    bottom: 0,
  },
  cow: {
    fontSize: 68,
    margin: 5,
  },
  button: {
    flex: 3,
    backgroundColor: 'white',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    marginRight: 10,
  },
  text: {
    color: '#424242',
    fontSize: 16,
  },
});

export default class Cognitive extends React.Component {
  constructor(props) {
    super(props);
    const ds = new ListView.DataSource({ rowHasChanged: (r1, r2) => r1 !== r2 });

    this.state = {
      ds,
      key: Math.random(),
      dataSource: ds.cloneWithRows([{ uri: 'row 1' }, { uri: 'row 2' }]),
      status: 'BEFORE_UPLOAD',
      caption: 'caption',
      currentSection: 0,
    };
  }

  componentDidMount() {
    Permissions.getPermissionStatus('photo')
      .then(response => {
        // response is one of: 'authorized', 'denied', 'restricted', or 'undetermined'
        console.log('Photo permission status', response);
        if (response !== 'authorized' && response !== 'undetermined') {
          this.setState({ status: 'DENIED' });
          this.requestPermission();
        } else {
          const that = this;
          CameraRoll.getPhotos({
            first: 5000,
            assetType: 'Photos',
          }).then((data) => {
            const media = [];
            data.edges.forEach(d => media.push({
              uri: d.node.image.uri,
              height: d.node.image.height,
              width: d.node.image.width,
              location: d.node.location,
            }));
            // console.log(media);
            that.setState({
              media,
              key: Math.random(),
              dataSource: this.state.ds.cloneWithRows(media),
            });
          }).catch(error => console.error(error));
        }
      });
  }

  requestPermission() {
    Alert.alert(
      'Can we access your photos?',
      'We need access so you can use the function.',
      [
        { text: 'No way', onPress: () => console.log('permission denied'), style: 'cancel' },
        { text: 'Open Settings', onPress: Permissions.openSettings },
      ]
    );
  }

  uploadImage(uri) {
    let file;
    const filename = /id=(.*)\&ext/i.exec(uri)[0].replace('id=', '').replace('&ext', '');  // eslint-disable-line no-useless-escape
    if (uri.indexOf('JPG') || true) {  // eslint-disable-line no-constant-condition
      file = {
        // uri,
        name: `${filename}.jpg`,
        type: 'image/jpg',
      };
    } else {
      file = {
        // uri,
        name: `${filename}.png`,
        type: 'image/png',
      };
    }
    console.log(file);

    const options = Object.assign(config.s3, { keyPrefix: `uploads/${uniqueID}/` });
    const that = this;

    ImageResizer.createResizedImage(uri, 800, 800, 'JPEG', 50).then((resizedImageUri) => {
      console.log('resizedImageUri', resizedImageUri);
      file.uri = resizedImageUri;

      RNS3.put(file, options).then(response => {
        if (response.status !== 201) {
          console.log(response);
          throw new Error('Failed to upload image to S3');
        }
        console.log(response.body);
      })
      .progress((e) => {
        console.log(e.loaded / e.total);
        if (e.loaded / e.total < 1) {
          that.setState({ status: 'UPLOADING' });
        } else if (e.loaded / e.total === 1) {
          that.cognitiveService('describe', uri);
        }
      });
    }).catch((err) => {
      console.log('ImageResizer', err);
    });
  }

  cognitiveService(service, uri) {
    const s3Bucket = config.s3.uri;
    const filename = /id=(.*)\&ext/i.exec(uri)[0].replace('id=', '').replace('&ext', '');  // eslint-disable-line no-useless-escape
    let s3Url;
    if (uri.indexOf('JPG') || true) {  // eslint-disable-line no-constant-condition
      s3Url = `${s3Bucket}/uploads/${uniqueID}/${filename}.jpg`;
    } else {
      s3Url = `${s3Bucket}/uploads/${uniqueID}/${filename}.png`;
    }

    const that = this;
    fetch(`https://api.projectoxford.ai/vision/v1.0/${service}`, {
      method: 'POST',
      headers: Object.assign({ 'Content-Type': 'application/json' }, config.cognitive),
      body: JSON.stringify({
        url: s3Url,
      }),
    })
    .then((response) => response.json())
    .then((json) => {
      console.log(json);
      if (json.description && json.description.captions && json.description.captions.length > 0) {
        // Alert.alert(
        //   service.toUpperCase(),
        //   JSON.stringify(json),
        //   [{ text: 'Cancel', onPress: () => console.log('Cancel Pressed'), style: 'cancel' }]
        // );
        that.setState({
          status: 'UPLOADED',
          caption: json.description.captions[0].text,
        });
        firebase.database().ref(`users/${uniqueID}/${filename}/describe`).set(json);
      } else {
        console.log('RetryCognitiveService in 1 section.');
        timer.setTimeout(that, 'RetryCognitiveService', () => that.cognitiveService(service, uri), 1000);
      }
    })
    .catch((error) => {
      console.warn(error);
    });
  }

  report(uri) {
    const filename = /id=(.*)\&ext/i.exec(uri)[0].replace('id=', '').replace('&ext', '');  // eslint-disable-line no-useless-escape
    Alert.alert(
      'Report',
      '',
      [
        {
          text: 'Not accurate', onPress: () => {
            console.log('Not accurate');
            firebase.database().ref(`users/${uniqueID}/${filename}/isNotAccurate`).set(true);
          },
        },
        {
          text: 'Abuse content',
          onPress: () => {
            console.log('Abuse content');
            firebase.database().ref(`users/${uniqueID}/${filename}/isAbuseContent`).set(true);
          },
        },
        { text: 'Cancel', onPress: () => console.log('Cancel Pressed'), style: 'cancel' },
      ]
    );
  }

  render() {
    GoogleAnalytics.trackScreenView('Home');
    return (
      <View style={styles.container}>
        <View style={styles.body}>
          <ListView
            ref="scrollView"
            dataSource={this.state.dataSource}
            renderRow={(rowData) => <View style={styles.slideContainer}>
              <Image
                style={[styles.image, { height: width * rowData.height / rowData.width }]}
                source={{ uri: rowData.uri }}
              />
            </View>}
            horizontal={true}
            onScroll={(event) => {
              if (event.nativeEvent.contentOffset.x < THRESHOLD) {
                //
              } else if (event.nativeEvent.contentOffset.x - OFFSETY > THRESHOLD) {
                console.log('onScroll Right');
              } else if (OFFSETY - event.nativeEvent.contentOffset.x > THRESHOLD) {
                console.log('onScroll Left');
              }
              OFFSETY = event.nativeEvent.contentOffset.x;
              console.log('currentSection', Math.round(event.nativeEvent.contentOffset.x / width));
              if (this.state.status !== 'DENIED') {
                this.setState({
                  currentSection: event.nativeEvent.contentOffset.x > 0 ? Math.round(event.nativeEvent.contentOffset.x / width) : 0,
                  // status: 'BEFORE_UPLOAD',
                });
              }
            }}
          />
        </View>
        <View style={styles.footer}>
          <View style={styles.cowBlock}>
            <Text style={styles.cow}>🐮</Text>
            <TouchableHighlight
              onPress={() => {
                if (this.state.status !== 'DENIED') {
                  this.refs.scrollView.scrollTo({ x: width * this.state.currentSection });
                  GoogleAnalytics.trackEvent('user-action', 'describe');
                  this.uploadImage(this.state.media[this.state.currentSection].uri);
                  this.setState({ status: 'UPLOADING' });
                } else {
                  this.requestPermission();
                }
              }}
              style={styles.button}
              underlayColor="#E0E0E0"
            >
              <View>
              {(() => {
                switch (this.state.status) {
                  case 'DENIED': return (<Animatable.Text style={styles.text} animation="fadeIn">
                    {'We need access to your photos.'}
                  </Animatable.Text>);
                  case 'BEFORE_UPLOAD': return (<Animatable.Text style={styles.text} animation="fadeIn">
                    {'Click me to see what I sees.'}
                  </Animatable.Text>);
                  case 'UPLOADING': return <Spinner isVisible={true} size={20} type="Wave" color="#424242" />;
                  case 'UPLOADED': return (<Animatable.Text style={styles.text} animation="fadeIn">
                    {`I see ${this.state.caption}.`}
                  </Animatable.Text>);
                  default: return null;
                }
              })()}
              </View>
            </TouchableHighlight>
          </View>
          <View style={styles.flagBlock}>
            {this.state.status === 'UPLOADED' &&
              <Icon.Button
                name="flag"
                backgroundColor="#37474F"
                size={12} onPress={
                  () => this.report(this.state.media[this.state.currentSection].uri)
                }
              />}
          </View>
        </View>
        <AdmobCell />
      </View>
    );
  }
}
