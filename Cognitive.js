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
import AdmobCell from './app/components/admob';

// 3rd party libraries
import { RNS3 } from 'react-native-aws3';
import * as Animatable from 'react-native-animatable';
import DeviceInfo from 'react-native-device-info';
import GoogleAnalytics from 'react-native-google-analytics-bridge';
import Icon from 'react-native-vector-icons/MaterialIcons';
import ImageResizer from 'react-native-image-resizer';  // eslint-disable-line import/no-unresolved
import Permissions from 'react-native-permissions';  // eslint-disable-line import/no-unresolved
import Speech from 'react-native-speech';
import Spinner from 'react-native-spinkit';
import timer from 'react-native-timer';
import Camera from 'react-native-camera';

import SleekLoadingIndicator from 'react-native-sleek-loading-indicator';

import { config } from './config';

GoogleAnalytics.setTrackerId(config.googleAnalytics[Platform.OS]);

if (DeviceInfo.getDeviceName() === 'iPhone Simulator') {
  GoogleAnalytics.setDryRun(true);
}

import firebase from 'firebase';
firebase.initializeApp(config.firebase);

const { width } = Dimensions.get('window');
const uniqueID = DeviceInfo.getUniqueID();

let OFFSETY;
const THRESHOLD = Platform.OS === 'ios' ? 50 : 20;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#37474F',
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
  camera: {
    position: 'absolute',
    right: 20,
    top: 30,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'white',
    borderRadius: 5,
    padding: 8,
  },
  cameraIcon: {
    backgroundColor: 'transparent',
  },
  preview: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
    width: Dimensions.get('window').width,
  },
});

export default class Cognitive extends React.Component {
  constructor(props) {
    super(props);
    const ds = new ListView.DataSource({ rowHasChanged: (r1, r2) => r1 !== r2 });

    this.state = {
      mode: 'CAMERA',
      ds,
      key: Math.random(),
      dataSource: ds.cloneWithRows([{ uri: 'row 1' }, { uri: 'row 2' }]),
      status: 'BEFORE_UPLOAD',
      caption: 'caption',
      currentSection: 0,
    };
  }

  componentDidMount() {
    if (Platform.OS === 'ios') {
      Permissions.getPermissionStatus('photo')
        .then(response => {
          // response is one of: 'authorized', 'denied', 'restricted', or 'undetermined'
          console.log('Photo permission status', response);
          if (response !== 'authorized' && response !== 'undetermined') {
            this.setState({ status: 'DENIED' });
            this.requestPermission();
          } else {
            this.getPhotos();
          }
        });
    } else {
      this.getPhotos();
    }
  }

  getPhotos() {
    try {
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
        console.log(media.slice(0, 3));
        that.setState({
          media,
          key: Math.random(),
          dataSource: this.state.ds.cloneWithRows(media),
        });
      }).catch(error => console.error(error));
    } catch (err) {
      Alert.alert(
        'Cannot access your camera?',
        'We need access so you can use the function.',
        [
          { text: 'Ok', onPress: () => console.log(), style: 'cancel' },
        ]
      );
    }
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
    let filename;
    try {
      filename = /id=(.*)\&ext/i.exec(uri)[0].replace('id=', '').replace('&ext', '');  // eslint-disable-line no-useless-escape
    } catch (err) {
      filename = uri.replace(/^.*[\\\/]/, '').replace('.jpg', '');
    }
    if (uri.indexOf('JPG')) {  // eslint-disable-line no-constant-condition
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

    ImageResizer.createResizedImage(uri, 500, 500, 'JPEG', 40).then((resizedImageUri) => {
      console.log('resizedImageUri', resizedImageUri);
      file.uri = resizedImageUri;

      RNS3.put(file, options).then(response => {
        if (response.status !== 201) {
          console.log(response);
          throw new Error('Failed to upload image to S3');
        }
        console.log('S3 uploaded', response.body);
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
    fetch(`https://api.projectoxford.ai/vision/v1.0/${service}`, {
      method: 'POST',
      headers: Object.assign({ 'Content-Type': 'application/json' }, config.cognitive),
      body: JSON.stringify({
        url: s3Url,
      }),
    })
    .then((response) => response.json())
    .then((json) => {
      console.log('Cognitive analytics', json);
      if (json.description && json.description.captions && json.description.captions.length > 0) {
        // Alert.alert(
        //   service.toUpperCase(),
        //   JSON.stringify(json),
        //   [{ text: 'Cancel', onPress: () => console.log('Cancel Pressed'), style: 'cancel' }]
        // );
        const caption = json.description.captions[0].text;
        that.setState({
          caption,
          status: 'UPLOADED',
        });

        if (Platform.OS === 'ios') {
          Speech.speak({
            text: `Moo moo, I see ${caption}`,
            voice: 'en-US',
            rate: 0.3,
          });
        }
        firebase.database().ref(`users/${uniqueID}/${filename}/describe`).set(json);
      } else {
        console.log('RetryCognitiveService in 1 second.');
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
    if (this.state.mode === 'LIBRARY') {
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
            <TouchableHighlight style={styles.camera} onPress={() => this.setState({ mode: 'CAMERA' })}>
              <Icon name="photo-camera" style={styles.cameraIcon} size={26} color="white" />
            </TouchableHighlight>
            <SleekLoadingIndicator loading={this.state.status === 'UPLOADING'} />
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
                  size={12}
                  onPress={
                    () => this.report(this.state.media[this.state.currentSection].uri)
                  }
                />}
            </View>
          </View>
          <AdmobCell />
        </View>
      );
    } else if (this.state.mode === 'CAMERA') {
      return (
        <View style={styles.container}>
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
            />
            <TouchableHighlight style={styles.camera} onPress={() => this.setState({ mode: 'LIBRARY' })}>
              <Icon name="photo-library" style={styles.cameraIcon} size={26} color="white" />
            </TouchableHighlight>
            <SleekLoadingIndicator loading={this.state.status === 'UPLOADING'} />
          </View>

          <View style={styles.footer}>
            <View style={styles.cowBlock}>
              <Text style={styles.cow}>🐮</Text>
              <TouchableHighlight
                onPress={() => {
                  if (this.state.status !== 'DENIED') {
                    GoogleAnalytics.trackEvent('user-action', 'take-photo');
                    const that = this;
                    this.camera.capture()
                      .then((data) => {
                        console.log(data);
                        that.uploadImage(data.path);
                      })
                      .catch(err => console.error(err));
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
                      {'Tap me to see what I sees.'}
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
                  size={12}
                  onPress={() => this.report(this.state.media[this.state.currentSection].uri)}
                />}
            </View>
          </View>
          <AdmobCell />
        </View>
      );
    }
  }
}
