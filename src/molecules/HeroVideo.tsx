/**
 * HeroVideo — molecule
 *
 * A silent, auto-playing, looping background video for a masthead/hero slot.
 * Drop it into the Masthead `background` slot (or any full-bleed container);
 * it fills its parent with `contentFit="cover"`. Behind the video sits a
 * solid fallback fill (surface.sunken) so the area never flashes black while
 * the first frame loads or on platforms that can't decode the source.
 *
 * Built on expo-video (Expo SDK 54). The source must be an H.264 MP4 — iOS
 * cannot decode webm/VP9, so keep hero clips in MP4.
 *
 * Composition (existing only):
 *   - <VideoView> + useVideoPlayer (expo-video)
 */
import React from 'react';
import { View, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useIsFocused } from '@react-navigation/native';
import { colors } from '../tokens';

export interface HeroVideoProps {
  /** require('...') asset or { uri } for the MP4 (H.264) clip. */
  source: Parameters<typeof useVideoPlayer>[0];
  /** Fallback fill shown behind the video. Defaults to surface.sunken. */
  backgroundColor?: string;
  style?: StyleProp<ViewStyle>;
}

export function HeroVideo({
  source,
  backgroundColor = colors.surface.sunken,
  style,
}: HeroVideoProps) {
  const player = useVideoPlayer(source, (p) => {
    p.loop = true;
    p.muted = true;
    // Hero loop is decorative — start as soon as it's ready.
    p.play();
  });

  // Keep the loop where it was across tab switches. When the screen blurs the
  // native VideoView goes invisible and expo-video resets the clip to 0, so on
  // blur we remember the position and pause; on focus we seek back and resume —
  // the video continues from where it left off instead of restarting.
  const isFocused = useIsFocused();
  const lastTimeRef = React.useRef(0);
  React.useEffect(() => {
    if (isFocused) {
      if (lastTimeRef.current > 0) {
        player.currentTime = lastTimeRef.current;
      }
      player.play();
    } else {
      lastTimeRef.current = player.currentTime;
      player.pause();
    }
  }, [isFocused, player]);

  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor }, style]}>
      <VideoView
        player={player}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        nativeControls={false}
        // Decorative background — no fullscreen / PiP affordances.
        allowsFullscreen={false}
        allowsPictureInPicture={false}
      />
    </View>
  );
}
