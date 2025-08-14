import {
  ChannelProfileType,
  ErrorCodeType,
  IRtcEngineEx,
  RtcConnection,
  RtcStats,
  UserOfflineReasonType,
} from 'agora-electron-sdk';
import { useCallback, useEffect, useRef, useState } from 'react';

import { askMediaAccess } from '../renderer/utils/permission';
import { agoraManager } from '../modules/agoraManager';

const useInitRtcEngine = ({
  appId,
  channelId,
  token,
  uid,
  enableVideo,
  listenUserJoinOrLeave = true,
}: {
  appId: string;
  channelId: string;
  token: string;
  uid: number;
  enableVideo: boolean;
  listenUserJoinOrLeave: boolean;
}) => {
  const [joinChannelSuccess, setJoinChannelSuccess] = useState(false);
  const [remoteUsers, setRemoteUsers] = useState<number[]>([]);
  const [startPreview, setStartPreview] = useState(false);

  const engine = useRef<IRtcEngineEx | null>(null);

  const initRtcEngine = useCallback(async () => {
    if (!appId) {
      console.error(`appId is invalid`);
      return;
    }

    try {
      // Use the centralized Agora manager
      engine.current = agoraManager.initialize(appId);

      // The engine is already initialized with proper configuration in the manager
      // No need to call initialize again
    } catch (error) {
      console.error('Failed to initialize RTC engine:', error);
      return;
    }

    if (!engine.current) {
      console.error('Engine not initialized');
      return;
    }

    // Need granted the microphone permission
    await askMediaAccess(['microphone']);

    // Only need to enable audio on this case
    engine.current.enableAudio();

    if (enableVideo) {
      // Need granted the camera permission
      await askMediaAccess(['camera']);

      // Need to enable video on this case
      // If you only call `enableAudio`, only relay the audio stream to the target channel
      engine.current.enableVideo();

      // Start preview before joinChannel
      engine.current.startPreview();
      setStartPreview(true);
    }
  }, [appId, enableVideo]);

  const onError = useCallback((err: ErrorCodeType, msg: string) => {
    console.info('onError', 'err', err, 'msg', msg);
  }, []);

  const onJoinChannelSuccess = useCallback(
    (connection: RtcConnection, elapsed: number) => {
      console.info(
        'onJoinChannelSuccess',
        'connection',
        connection,
        'elapsed',
        elapsed
      );
      if (
        connection.channelId === channelId &&
        (connection.localUid === uid || uid === 0)
      ) {
        setJoinChannelSuccess(true);
      }
    },
    [channelId, uid]
  );

  const onLeaveChannel = useCallback(
    (connection: RtcConnection, stats: RtcStats) => {
      console.info('onLeaveChannel', 'connection', connection, 'stats', stats);
      if (
        connection.channelId === channelId &&
        (connection.localUid === uid || uid === 0)
      ) {
        setJoinChannelSuccess(false);
        setRemoteUsers([]);
      }
    },
    [channelId, uid]
  );

  const onUserJoined = useCallback(
    (connection: RtcConnection, remoteUid: number, elapsed: number) => {
      console.info(
        'onUserJoined',
        'connection',
        connection,
        'remoteUid',
        remoteUid,
        'elapsed',
        elapsed
      );
      if (
        connection.channelId === channelId &&
        (connection.localUid === uid || uid === 0)
      ) {
        setRemoteUsers(prev => {
          if (prev === undefined) return [];
          return [...prev, remoteUid];
        });
      }
    },
    [channelId, uid]
  );

  const onUserOffline = useCallback(
    (
      connection: RtcConnection,
      remoteUid: number,
      reason: UserOfflineReasonType
    ) => {
      console.info(
        'onUserOffline',
        'connection',
        connection,
        'remoteUid',
        remoteUid,
        'reason',
        reason
      );
      if (
        connection.channelId === channelId &&
        (connection.localUid === uid || uid === 0)
      ) {
        setRemoteUsers(prev => {
          if (prev === undefined) return [];
          return prev!.filter(value => value !== remoteUid);
        });
      }
    },
    [channelId, uid]
  );

  useEffect(() => {
    (async () => {
      await initRtcEngine();
    })();

    // Note: We don't release the engine here as it's managed by the centralized manager
    // The manager will handle cleanup when the app quits
  }, [initRtcEngine]);

  useEffect(() => {
    if (!engine.current) {
      return;
    }

    engine.current.addListener('onError', onError);
    engine.current.addListener('onJoinChannelSuccess', onJoinChannelSuccess);
    engine.current.addListener('onLeaveChannel', onLeaveChannel);
    if (listenUserJoinOrLeave) {
      engine.current.addListener('onUserJoined', onUserJoined);
      engine.current.addListener('onUserOffline', onUserOffline);
    }

    const engineCopy = engine.current;
    return () => {
      if (engineCopy) {
        engineCopy.removeListener('onError', onError);
        engineCopy.removeListener('onJoinChannelSuccess', onJoinChannelSuccess);
        engineCopy.removeListener('onLeaveChannel', onLeaveChannel);
        if (listenUserJoinOrLeave) {
          engineCopy.removeListener('onUserJoined', onUserJoined);
          engineCopy.removeListener('onUserOffline', onUserOffline);
        }
      }
    };
  }, [
    engine,
    onError,
    onJoinChannelSuccess,
    onLeaveChannel,
    onUserJoined,
    onUserOffline,
    listenUserJoinOrLeave,
  ]);

  return {
    appId,
    channelId,
    token,
    uid,
    joinChannelSuccess,
    setJoinChannelSuccess,
    remoteUsers,
    setRemoteUsers,
    startPreview,
    engine,
  };
};
export default useInitRtcEngine;
