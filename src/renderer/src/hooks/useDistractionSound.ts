import { useEffect, useRef, useState } from "react";
import { Category } from "@shared/types";
import { useAuth } from "../contexts/AuthContext";
import { localApi, ElectronAppSettings } from "../lib/localApi";

export function useDistractionSound(
  categoryDetails: Category | null | undefined,
) {
  const { user, isAuthenticated } = useAuth();
  const [electronSettings, setElectronSettings] =
    useState<ElectronAppSettings | null>(null);

  const [distractionAudio, setDistractionAudio] =
    useState<HTMLAudioElement | null>(null);
  const lastPlayedRef = useRef<number | null>(null);

  // Load electron settings
  useEffect(() => {
    if (isAuthenticated) {
      const loadSettings = async () => {
        try {
          const userData = await localApi.user.get();
          if (userData && userData.electron_app_settings) {
            setElectronSettings(userData.electron_app_settings);
          }
        } catch (error) {
          console.error("Error loading electron settings:", error);
        }
      };
      loadSettings();
    }
  }, [isAuthenticated]);

  // On mount, get the audio data URL from the main process and create the Audio object.
  // Cleanup the audio element on unmount to prevent memory leaks.
  useEffect(() => {
    let audio: HTMLAudioElement | null = null;

    const loadAudio = async () => {
      // @ts-ignore
      const dataUrl = await window.api?.getAudioDataUrl();
      if (dataUrl) {
        audio = new Audio(dataUrl);
        setDistractionAudio(audio);
      }
    };
    loadAudio();

    // Cleanup: pause audio and release the HTMLAudioElement on unmount
    return () => {
      if (audio) {
        audio.pause();
        audio.src = ""; // Release the audio resource
        audio.load(); // Reset the element
      }
      setDistractionAudio(null);
    };
  }, []);

  // This effect runs whenever the category details change, to start or stop the sound.
  useEffect(() => {
    if (!distractionAudio || !electronSettings) return;

    // console.log('[useDistractionSound] Settings updated:', electronSettings)
    const { playDistractionSound, distractionSoundInterval } = electronSettings;
    const DISTRACTION_SOUND_INTERVAL_MS =
      (distractionSoundInterval ?? 30) * 1000;

    if (!playDistractionSound) {
      // console.log('[useDistractionSound] Sound is disabled. Stopping playback.')
      distractionAudio.pause();
      distractionAudio.currentTime = 0;
      lastPlayedRef.current = null;
      return;
    }

    let isDistracting = false;
    // console.log('[useDistractionSound] categoryDetails:', categoryDetails)

    if (
      categoryDetails &&
      typeof categoryDetails === "object" &&
      "_id" in categoryDetails
    ) {
      const fullCategoryDetails = categoryDetails as Category;
      if (fullCategoryDetails.isProductive === false) {
        isDistracting = true;
      }
    }
    // console.log(`[useDistractionSound] isDistracting: ${isDistracting}`)

    if (!isDistracting) {
      // console.log('[useDistractionSound] No longer distracting. Stopping sound.')
      distractionAudio.pause();
      distractionAudio.currentTime = 0; // Reset audio to the beginning for the next play
      // Reset last played time when no longer distracting
      lastPlayedRef.current = null;
      return;
    }

    const checkAndPlay = () => {
      // Since we're now running at the user's sound interval, we can play sound immediately
      distractionAudio
        .play()
        .catch((e) => console.error("Error playing distraction sound:", e));
      lastPlayedRef.current = Date.now();
    };

    // Play immediately on becoming distracting
    checkAndPlay();

    // Check at the user's configured sound interval instead of every second
    const intervalId = setInterval(checkAndPlay, DISTRACTION_SOUND_INTERVAL_MS);

    // Cleanup function to clear interval
    return () => {
      clearInterval(intervalId);
    };
  }, [categoryDetails, distractionAudio, electronSettings]);
}
