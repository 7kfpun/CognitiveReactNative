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

import firebase from 'firebase';

// 3rd party libraries
import { Actions } from 'react-native-router-flux';
import { RNS3 } from 'react-native-aws3';
import * as Animatable from 'react-native-animatable';
import Camera from 'react-native-camera';
import DeviceInfo from 'react-native-device-info';
import GoogleAnalytics from 'react-native-google-analytics-bridge';
import Icon from 'react-native-vector-icons/MaterialIcons';
import ImageResizer from 'react-native-image-resizer';  // eslint-disable-line import/no-unresolved,import/extensions
import Ionicon from 'react-native-vector-icons/Ionicons';
import Permissions from 'react-native-permissions';  // eslint-disable-line import/no-unresolved
import Share from 'react-native-share';
import SleekLoadingIndicator from 'react-native-sleek-loading-indicator';
import Speech from 'react-native-speech';
import store from 'react-native-simple-store';
import timer from 'react-native-timer';

// Components
import AdmobCell from './admob';

import { config } from '../config';

GoogleAnalytics.setTrackerId(config.googleAnalytics[Platform.OS]);

if (DeviceInfo.getDeviceName() === 'iPhone Simulator'
  || DeviceInfo.getDeviceName() === 'apple’s MacBook Pro'
  || DeviceInfo.getManufacturer() === 'Genymotion') {
  console.log('GoogleAnalytics setDryRun');
  GoogleAnalytics.setDryRun(true);
}

firebase.initializeApp(config.firebase);

const { width } = Dimensions.get('window');
const uniqueID = DeviceInfo.getUniqueID();

let OFFSETY;
const THRESHOLD = Platform.OS === 'ios' ? 50 : 20;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  body: {
    justifyContent: 'center',
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height - 50,
  },
  image: {
    width,
    resizeMode: 'stretch',
  },
  slideContainer: {
    justifyContent: 'center',
    alignItems: 'center',
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
    color: 'white',
    fontSize: 18,
    textAlign: 'center',
  },
  smallText: {
    color: '#9E9E9E',
    fontSize: 11,
    textAlign: 'center',
  },
  changeModeButton: {
    position: 'absolute',
    right: 20,
    top: 30,
    borderWidth: StyleSheet.hairlineWidth * 5,
    borderColor: 'white',
    borderRadius: 5,
    padding: 8,
  },
  infoButton: {
    position: 'absolute',
    left: 20,
    top: 30,
    borderWidth: StyleSheet.hairlineWidth * 5,
    borderColor: 'white',
    borderRadius: 5,
    padding: 8,
  },
  cameraButton: {
    flex: 1,
    position: 'absolute',
    bottom: 0,
  },
  icon: {
    backgroundColor: 'transparent',
  },
  cameraOptionIcon: {
    backgroundColor: 'transparent',
    padding: 30,
  },
  preview: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  uploadImageBlock: {
    position: 'absolute',
    bottom: 0,
    width: Dimensions.get('window').width,
  },
  textBox: {
    height: 100,
    margin: 20,
    padding: 20,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 5,
  },
});

export default class Cognitive extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      mode: 'CAMERA',
      isFlashOn: false,
      isCameraFront: false,
      dataSource: new ListView.DataSource({ rowHasChanged: (row1, row2) => row1 !== row2 }),
      status: 'BEFORE_UPLOAD',
      caption: null,
      currentSection: 0,
      isCameraRollLoaded: false,
    };
  }

  componentDidMount() {
    const that = this;
    store.get('language').then(language => that.setState({ language }));

    Speech.supportedVoices()
      .then((locales) => {
        console.log(locales);
      });
  }

  getPhotos() {
    if (!this.state.isCameraRollLoaded) {
      this.setState({
        status: 'LOADING',
        isCameraRollLoaded: true,
      });
    }

    const that = this;
    CameraRoll.getPhotos({
      first: 1000,
      assetType: 'Photos',
    }).then((data) => {
      const media = [];
      data.edges.forEach(d => media.push({
        uri: d.node.image.uri,
        height: d.node.image.height,
        width: d.node.image.width,
        location: d.node.location,
      }));

      that.setState({
        media,
        key: Math.random(),
        dataSource: this.state.dataSource.cloneWithRows(media),
        status: 'BEFORE_UPLOAD',
      });
    }).catch((error) => {
      console.log('CameraRoll', error);
      that.alertPermission('photo');
    });
  }

  alertPermission(permissionType) {
    let title;
    let message;
    if (permissionType === 'photo') {
      title = 'Can we access your photos?';
      message = 'We need access so you can get your picture.';
    } else {
      title = 'Can we access your camera?';
      message = 'We need access so you can take a photo.';
    }

    Alert.alert(
      title,
      message,
      [
        { text: 'No way', onPress: () => console.log('permission denied'), style: 'cancel' },
        { text: 'Open Settings', onPress: Permissions.openSettings },
      ]
    );
  }

  uploadImage(uri) {
    let file;
    let filename;
    try {
      filename = /id=(.*)\&ext/i.exec(uri)[0].replace('id=', '').replace('&ext', '');  // eslint-disable-line no-useless-escape
    } catch (err) {
      filename = uri.replace(/^.*[\\\/]/, '').replace('.jpg', '');
    }
    if (uri.indexOf('JPG')) {  // eslint-disable-line no-constant-condition
      file = {
        uri,
        name: `${filename}.jpg`,
        type: 'image/jpg',
      };
    } else {
      file = {
        uri,
        name: `${filename}.png`,
        type: 'image/png',
      };
    }
    console.log(file);

    const options = Object.assign(config.s3, { keyPrefix: `uploads/${uniqueID}/` });
    const that = this;

    ImageResizer.createResizedImage(uri, 400, 400, 'JPEG', 30).then((resizedImageUri) => {
      console.log('resizedImageUri', resizedImageUri);
      file.uri = resizedImageUri;

      RNS3.put(file, options).then((response) => {
        if (response.status !== 201) {
          console.log(response);
          throw new Error('Failed to upload image to S3');
        }
        console.log('S3 uploaded', response.body);

        that.setState({ status: 'ANALYZING' });
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
    let filename;
    try {
      filename = /id=(.*)\&ext/i.exec(uri)[0].replace('id=', '').replace('&ext', '');  // eslint-disable-line no-useless-escape
    } catch (err) {
      filename = uri.replace(/^.*[\\\/]/, '').replace('.jpg', '');
    }
    let s3Url;
    if (uri.indexOf('JPG') || true) {  // eslint-disable-line no-constant-condition
      s3Url = `${s3Bucket}/uploads/${uniqueID}/${filename}.jpg`;
    } else {
      s3Url = `${s3Bucket}/uploads/${uniqueID}/${filename}.png`;
    }

    const that = this;
    fetch(`https://api.projectoxford.ai/vision/v1.0/${service}`, {  // eslint-disable-line no-undef
      method: 'POST',
      headers: Object.assign({ 'Content-Type': 'application/json' }, config.cognitive),
      body: JSON.stringify({
        url: s3Url,
      }),
    })
    .then(response => response.json())
    .then((json) => {
      console.log('Cognitive analytics', json);
      if (json.description && json.description.captions && json.description.captions.length > 0) {
        const caption = json.description.captions[0].text;
        const confidence = json.description.captions[0].confidence;
        const tags = json.description.tags;

        store.get('language').then((language) => {
          that.setState({ language, caption, confidence, tags });
          that.checkTranslate(caption, language);
        });

        firebase.database().ref(`users/${uniqueID}/${filename}/describe`).set(json);

        firebase.database().ref(`app/img/${filename}/timestamp`).set(new Date().getTime());
        firebase.database().ref(`app/img/${filename}/uniqueID`).set(uniqueID);
        firebase.database().ref(`app/describe/${filename}`).set(json);
      } else {
        console.log('RetryCognitiveService in 2 second.');
        timer.setTimeout(that, 'RetryCognitiveService', () => that.uploadImage(uri), 2000);
      }
    })
    .catch((error) => {
      console.warn(error);
    });
  }

  read(text, language) {
    if (Platform.OS === 'ios') {
      Speech.speak({
        text,
        voice: language || 'en-US',
        rate: 0.5,
      });
    }
  }

  checkTranslate(text, language) {
    // curl "https://www.googleapis.com/language/translate/v2?key=${config.googleTranslate}&q=hello%20world&source=en&target=zh"
    const that = this;
    if (language && language !== 'en') {
      fetch(`https://www.googleapis.com/language/translate/v2?key=${config.googleTranslate}&q=${text.replace(/ /g, '%20')}&source=en&target=${language}`, {  // eslint-disable-line no-undef
        method: 'GET',
      })
      .then(response => response.json())
      .then((json) => {
        console.log('Google translate', json);
        if (json.data && json.data.translations) {
          that.setState({
            caption: json.data.translations[0].translatedText,
            status: 'UPLOADED',
          });

          that.read(json.data.translations[0].translatedText, language);
        }
      });
    } else {
      this.setState({
        caption: text,
        status: 'UPLOADED',
      });

      this.read(text, 'en-US');
    }
  }

  shareImage(url, message) {
    const shareImageBase64 = {
      url,
      message,
      title: 'React Native',
      subject: 'Share Link',
    };
    Share.open(shareImageBase64);
  }

  render() {
    GoogleAnalytics.trackScreenView('Home');
    if (this.state.mode === 'LIBRARY') {
      return (
        <View style={styles.container}>
          <View style={styles.body}>
            <ListView
              ref={(lv) => { this.scrollView = lv; }}
              dataSource={this.state.dataSource}
              renderRow={rowData => <View style={styles.slideContainer}>
                <Image
                  style={[styles.image, { height: (width * rowData.height) / rowData.width }]}
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
                    status: 'BEFORE_UPLOAD',
                  });
                }
              }}
            />
            <TouchableHighlight style={styles.infoButton} onPress={Actions.info}>
              <Icon name="info" style={styles.icon} size={26} color="white" />
            </TouchableHighlight>
            <TouchableHighlight style={styles.changeModeButton} onPress={() => this.setState({ mode: 'CAMERA', status: 'BEFORE_UPLOAD' })}>
              <Icon name="photo-camera" style={styles.icon} size={26} color="white" />
            </TouchableHighlight>


            <View style={styles.uploadImageBlock}>
              {this.state.caption && this.state.status === 'UPLOADED' && <Animatable.View style={styles.textBox} animation="fadeIn">
                <Text style={styles.text}>{this.state.caption} <Text style={styles.smallText}>{`(${Math.round(this.state.confidence * 100)}%)`}</Text></Text>
                <Icon name="volume-up" style={[styles.icon, { position: 'absolute', right: 10 }]} size={26} color="white" onPress={() => this.read(this.state.caption, this.state.language)} />
              </Animatable.View>}
              <TouchableHighlight
                onPress={() => {
                  try {
                    this.scrollView.scrollTo({ x: width * this.state.currentSection });
                    this.uploadImage(this.state.media[this.state.currentSection].uri);
                    this.setState({ status: 'UPLOADING' });
                    GoogleAnalytics.trackEvent('user-action', 'describe');
                  } catch (err) {
                    this.alertPermission('photo');
                  }
                }}
                underlayColor="transparent"
              >
                <View style={{ marginBottom: 52, justifyContent: 'center', alignItems: 'center', flexDirection: 'row' }}>
                  <Icon name="touch-app" style={styles.icon} size={72} color="white" />
                </View>
              </TouchableHighlight>
            </View>
          </View>

          <SleekLoadingIndicator text={`${this.state.status}...`} loading={this.state.status === 'LOADING' || this.state.status === 'UPLOADING' || this.state.status === 'ANALYZING'} />

          <AdmobCell />
        </View>
      );
    } else if (this.state.mode === 'CAMERA') {
      return (
        <View style={styles.container}>
          <TouchableHighlight
            onPress={() => {
              const that = this;
              Permissions.requestPermission('camera')
                .then((permission) => {
                  console.log('permission', permission);
                  if (permission === 'authorized') {
                    this.camera.capture()
                      .then((data) => {
                        console.log(data);
                        that.uploadImage(data.path);
                        that.setState({ url: data.path });
                      })
                      .catch(err => console.error(err));
                    this.setState({ status: 'UPLOADING' });
                    GoogleAnalytics.trackEvent('user-action', 'take-photo');
                  } else {
                    this.alertPermission('camera');
                  }
                });
            }}
            underlayColor="#E0E0E0"
          >
            <View style={styles.body}>
              <Camera
                ref={(cam) => {
                  this.camera = cam;
                }}
                style={styles.preview}
                aspect={Camera.constants.Aspect.fill}
                captureAudio={false}
                captureQuality={Camera.constants.CaptureQuality.medium}
                captureTarget={Camera.constants.CaptureTarget.temp}
                flashMode={this.state.isFlashOn ? Camera.constants.FlashMode.on : Camera.constants.FlashMode.off}
                type={this.state.isCameraFront ? Camera.constants.Type.front : Camera.constants.Type.back}
              >
                <View>
                  {this.state.caption && this.state.status === 'UPLOADED' && <Animatable.View style={styles.textBox} animation="fadeIn">
                    <Text style={styles.text}>{this.state.caption} <Text style={styles.smallText}>{`(${Math.round(this.state.confidence * 100)}%)`}</Text></Text>
                    <Icon name="volume-up" style={[styles.icon, { position: 'absolute', right: 10 }]} size={26} color="white" onPress={() => this.read(this.state.caption, this.state.language)} />
                  </Animatable.View>}
                  <View style={{ marginBottom: 30, justifyContent: 'space-between', alignItems: 'center', flexDirection: 'row' }}>
                    <Icon
                      name={this.state.isFlashOn ? 'flash-on' : 'flash-off'}
                      style={styles.cameraOptionIcon}
                      size={26}
                      color="white"
                      onPress={() => this.setState({ isFlashOn: !this.state.isFlashOn })}
                    />
                    <Icon name="camera" style={styles.icon} size={72} color="white" />
                    {Platform.OS === 'android' && <Icon
                      name={this.state.isCameraFront ? 'camera-front' : 'camera-rear'}
                      style={styles.cameraOptionIcon}
                      size={26}
                      color="white"
                      onPress={() => this.setState({ isCameraFront: !this.state.isCameraFront })}
                    />}
                    {Platform.OS === 'ios' && <Ionicon
                      name="ios-reverse-camera-outline"
                      style={styles.cameraOptionIcon}
                      size={42}
                      color="white"
                      onPress={() => this.setState({ isCameraFront: !this.state.isCameraFront })}
                    />}
                  </View>
                </View>
              </Camera>
              <TouchableHighlight style={styles.infoButton} onPress={Actions.info}>
                <Icon name="info" style={styles.icon} size={26} color="white" />
              </TouchableHighlight>
              <TouchableHighlight
                style={styles.changeModeButton}
                onPress={() => {
                  this.setState({ mode: 'LIBRARY', status: 'BEFORE_UPLOAD' });
                  this.getPhotos();
                }}
              >
                <Icon name="photo-library" style={styles.icon} size={26} color="white" />
              </TouchableHighlight>
            </View>
          </TouchableHighlight>

          <SleekLoadingIndicator text={`${this.state.status}...`} loading={this.state.status === 'LOADING' || this.state.status === 'UPLOADING' || this.state.status === 'ANALYZING'} />
          <AdmobCell />
        </View>
      );
    }
  }
}
