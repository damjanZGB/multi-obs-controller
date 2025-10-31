import {
  Alert,
  AlertIcon,
  Box,
  Container,
  Heading,
  Skeleton,
  Stack,
  useDisclosure,
  useToast
} from '@chakra-ui/react';
import { useState } from 'react';
import ControlBar from './components/ControlBar';
import TelemetryGrid from './components/TelemetryGrid';
import SettingsDrawer from './components/SettingsDrawer';
import { useTelemetry } from './hooks/useTelemetry';
import { useSettings } from './hooks/useSettings';
import { muteAll, setSceneAll } from './api/client';

const App = () => {
  const { telemetry, connected } = useTelemetry();
  const { settings, loading, error, save } = useSettings();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [mutingState, setMutingState] = useState<string>();
  const [savingSettings, setSavingSettings] = useState(false);
  const toast = useToast();

  const handleMute = async (muted: boolean) => {
    setMutingState(muted ? 'mute' : 'unmute');
    try {
      const result = await muteAll(muted);
      const failures = result.failed.length;
      toast({
        status: failures ? 'warning' : 'success',
        title: muted ? 'Mute command sent' : 'Unmute command sent',
        description: failures
          ? `${failures} instances reported issues.`
          : `${result.success.length} instances updated.`,
        isClosable: true
      });
    }
    catch (err) {
      toast({
        status: 'error',
        title: 'Command failed',
        description: err instanceof Error ? err.message : 'Unknown error',
        isClosable: true
      });
    }
    finally {
      setMutingState(undefined);
    }
  };

  const handleScene = async (sceneName: string) => {
    setMutingState(sceneName);
    try {
      const result = await setSceneAll({ sceneName });
      const failures = result.failed.length;
      toast({
        status: failures ? 'warning' : 'success',
        title: `Scene ${sceneName} applied`,
        description: failures
          ? `${failures} instances failed. Check logs and connectivity.`
          : `${result.success.length} instances updated.`,
        isClosable: true
      });
    }
    catch (err) {
      toast({
        status: 'error',
        title: 'Failed to set scene',
        description: err instanceof Error ? err.message : 'Unknown error',
        isClosable: true
      });
    }
    finally {
      setMutingState(undefined);
    }
  };

  const handleSaveSettings = async (payloadSettings: typeof settings) => {
    setSavingSettings(true);
    try {
      await save({ connections: payloadSettings });
      toast({
        status: 'success',
        title: 'Settings saved',
        isClosable: true
      });
    }
    catch (err) {
      toast({
        status: 'error',
        title: 'Failed to save settings',
        description: err instanceof Error ? err.message : 'Unknown error',
        isClosable: true
      });
      throw err;
    }
    finally {
      setSavingSettings(false);
    }
  };

  return (
    <Box minH="100vh" bg="gray.900" color="gray.100" py={10}>
      <Container maxW="7xl">
        <Stack spacing={6}>
          <Heading size="lg">Multi OBS Control Center</Heading>

          {error && (
            <Alert status="error">
              <AlertIcon />
              {error}
            </Alert>
          )}

          {loading && !settings.length && (
            <Stack spacing={4}>
              <Skeleton height="60px" borderRadius="lg" />
              <Skeleton height="240px" borderRadius="lg" />
            </Stack>
          )}

          <ControlBar
            onMute={() => handleMute(true)}
            onUnmute={() => handleMute(false)}
            onSetScene={handleScene}
            loadingCommand={mutingState}
            telemetryConnected={connected}
            onOpenSettings={onOpen}
          />

          <TelemetryGrid telemetry={telemetry} />

          <SettingsDrawer
            isOpen={isOpen}
            onClose={onClose}
            settings={settings}
            onSubmit={handleSaveSettings}
            submitting={savingSettings}
          />
        </Stack>
      </Container>
    </Box>
  );
};

export default App;
