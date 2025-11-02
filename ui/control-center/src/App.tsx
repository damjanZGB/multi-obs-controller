import {
  Alert,
  AlertIcon,
  Box,
  Container,
  Heading,
  Skeleton,
  Stack,
  Text,
  useColorModeValue,
  useDisclosure,
  useToast
} from '@chakra-ui/react';
import { useMemo, useState } from 'react';
import type { SettingsPayload } from '@control-center/shared';
import ControlBar from './components/ControlBar';
import TelemetryGrid from './components/TelemetryGrid';
import SettingsDrawer from './components/SettingsDrawer';
import { useTelemetry } from './hooks/useTelemetry';
import { useSettings } from './hooks/useSettings';
import { muteAll, setSceneAll } from './api/client';

const App = () => {
  const { telemetry, connected } = useTelemetry();
  const { connections, global, loading, error, save } = useSettings();
  const [commandIssues, setCommandIssues] = useState<Map<number, { reason: string; timestamp: number }>>(() => new Map());
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [mutingState, setMutingState] = useState<string>();
  const [savingSettings, setSavingSettings] = useState(false);
  const toast = useToast();
  const heroGradient = useColorModeValue(
    'linear(180deg, rgba(91, 141, 239, 0.18) 0%, rgba(231, 238, 252, 0.55) 45%, rgba(246, 245, 244, 0) 85%)',
    'linear(180deg, rgba(91, 141, 239, 0.24) 0%, rgba(45, 52, 70, 0.55) 55%, rgba(30, 30, 36, 0) 90%)'
  );

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
      setCommandIssues((prev) => {
        const next = new Map(prev);
        const timestamp = Date.now();
        result.failed.forEach(({ id, reason }) => {
          next.set(id, { reason, timestamp });
        });
        result.success.forEach((id) => {
          next.delete(id);
        });
        return next;
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
      setCommandIssues((prev) => {
        const next = new Map(prev);
        const timestamp = Date.now();
        result.failed.forEach(({ id, reason }) => {
          next.set(id, { reason, timestamp });
        });
        result.success.forEach((id) => {
          next.delete(id);
        });
        return next;
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

  const handleSaveSettings = async (payload: SettingsPayload) => {
    setSavingSettings(true);
    try {
      await save(payload);
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

  const visibleTelemetry = useMemo(() => {
    if (!connections.length) {
      return telemetry;
    }

    const enabledIds = new Set(
      connections.filter((connection) => connection.enabled).map((connection) => connection.id)
    );

    return telemetry.filter((item) => enabledIds.has(item.id));
  }, [telemetry, connections]);

  return (
    <Box minH="100vh" bg="bg.canvas" py={{ base: 10, md: 16 }} bgGradient={heroGradient}>
      <Container maxW="7xl">
        <Stack spacing={8}>
          <Heading size="lg">Multi OBS Control Center</Heading>

          {error && (
            <Alert status="error">
              <AlertIcon />
              {error}
            </Alert>
          )}

          {loading && !connections.length && (
            <Stack spacing={4}>
              <Skeleton height="60px" borderRadius="lg" />
              <Skeleton height="240px" borderRadius="lg" />
            </Stack>
          )}

          <ControlBar
            scenePresets={global.scenePresets}
            onMute={async () => { await handleMute(true); }}
            onUnmute={async () => { await handleMute(false); }}
            onSetScene={async (scene) => { await handleScene(scene); }}
            loadingCommand={mutingState}
            telemetryConnected={connected}
            onOpenSettings={onOpen}
          />

          <TelemetryGrid telemetry={visibleTelemetry} issues={commandIssues} />

          <SettingsDrawer
            isOpen={isOpen}
            onClose={onClose}
            connections={connections}
            global={global}
            onSubmit={handleSaveSettings}
            submitting={savingSettings}
          />
        </Stack>
      </Container>
    </Box>
  );
};

export default App;
