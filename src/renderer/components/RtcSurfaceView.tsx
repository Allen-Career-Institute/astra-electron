import React, { Component } from 'react';
import agoraScreenShareService from '../../modules/agoraScreenShareService';

// Define the necessary types locally since we can't import from agora-electron-sdk in renderer
interface VideoCanvas {
  uid: number;
  sourceType?: number;
  renderMode?: number;
  mirrorMode?: number;
}

const VideoSourceType = {
  VideoSourceScreen: 1,
} as const;

const VideoMirrorModeType = {
  VideoMirrorModeDisabled: 0,
  VideoMirrorModeEnabled: 1,
} as const;

const VideoViewSetupMode = {
  VideoViewSetupAdd: 0,
  VideoViewSetupRemove: 1,
} as const;

interface Props {
  canvas: VideoCanvas;
  containerClass?: string;
  videoClass?: string;
}

interface State {
  isMirror: boolean;
  uniqueId: number;
}

export class RtcSurfaceView extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      isMirror:
        props.canvas.mirrorMode === VideoMirrorModeType.VideoMirrorModeDisabled,
      uniqueId: Math.floor(Math.random() * 1000000),
    };
  }

  getHTMLElement = () => {
    const { uniqueId } = this.state;
    const { canvas } = this.props;

    return document.querySelector(
      `#video-${canvas.uid}-${uniqueId}`
    ) as HTMLElement;
  };

  componentDidMount() {
    const { canvas } = this.props;
    this.setupVideoView(canvas, VideoViewSetupMode.VideoViewSetupAdd);

    // Setup the video view with Agora directly
    const element = this.getHTMLElement();
    if (element) {
      agoraScreenShareService.setupLocalVideoView(element);
    }
  }

  shouldComponentUpdate(
    nextProps: Readonly<Props>,
    nextState: Readonly<State>
  ): boolean {
    return (
      JSON.stringify(this.props.canvas) !== JSON.stringify(nextProps.canvas) ||
      JSON.stringify(this.state) !== JSON.stringify(nextState)
    );
  }

  componentDidUpdate() {
    this.updateRenderer();
  }

  componentWillUnmount() {
    const { canvas } = this.props;
    this.setupVideoView(canvas, VideoViewSetupMode.VideoViewSetupRemove);
  }

  setupVideoView = (canvas: VideoCanvas, setupMode: number) => {
    // This will be handled by the Agora engine setup
    const element = this.getHTMLElement();
    if (element) {
      // The actual video setup will be done by the Agora engine
      // This component just provides the DOM element
    }
  };

  updateRenderer = () => {
    const { canvas } = this.props;
    const { isMirror } = this.state;

    // Update mirror mode if needed - directly with Agora service
    const element = this.getHTMLElement();
    if (element) {
      agoraScreenShareService.setupLocalVideoView(element);
    }
  };

  render() {
    const { canvas, containerClass, videoClass } = this.props;
    const { uniqueId } = this.state;

    return (
      <div
        className={containerClass || 'rtc-surface-container'}
        style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          backgroundColor: '#000',
          borderRadius: '8px',
          overflow: 'hidden',
          cursor: 'pointer',
        }}
      >
        <div
          className={videoClass || 'rtc-video-element'}
          id={`video-${canvas.uid}-${uniqueId}`}
          style={{
            width: '100%',
            height: '100%',
            backgroundColor: '#000',
          }}
        />
      </div>
    );
  }
}

export default RtcSurfaceView;
