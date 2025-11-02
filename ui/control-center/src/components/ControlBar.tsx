import { MoonIcon, SunIcon } from '@chakra-ui/icons';
import {
  Box,
  Button,
  ButtonGroup,
  Flex,
  HStack,
  IconButton,
  Spacer,
  Text,
  Tooltip,
  useColorMode
} from '@chakra-ui/react';

type ControlBarProps = {
  onMute: () => Promise<void>;
  onUnmute: () => Promise<void>;
  onSetScene: (sceneName: string) => Promise<void>;
  scenePresets: string[];
  loadingCommand?: string;
  telemetryConnected: boolean;
  onOpenSettings: () => void;
};

const ControlBar = ({
  onMute,
  onUnmute,
  onSetScene,
  scenePresets,
  loadingCommand,
  telemetryConnected,
  onOpenSettings
}: ControlBarProps) => {
  const { colorMode, toggleColorMode } = useColorMode();
  const statusColor = telemetryConnected ? 'status.connected' : 'status.offline';
  const indicatorShadow = telemetryConnected
    ? '0 0 0 8px rgba(91, 141, 239, 0.18)'
    : '0 0 0 8px rgba(158, 161, 170, 0.18)';
  const toggleLabel = colorMode === 'light' ? 'Switch to dark mode' : 'Switch to light mode';

  return (
    <Flex
      align={{ base: 'stretch', lg: 'center' }}
      wrap="wrap"
      gap={4}
      p={{ base: 5, md: 6 }}
      borderRadius="surface"
      bg="bg.surface"
      borderWidth="1px"
      borderColor="border.subtle"
      shadow="surface"
    >
      <HStack spacing={4} align="center">
        <Tooltip label={telemetryConnected ? 'Telemetry live' : 'Telemetry disconnected'}>
          <HStack spacing={3}>
            <Box
              w={3}
              h={3}
              borderRadius="full"
              bg={statusColor}
              boxShadow={indicatorShadow}
            />
            <Text fontWeight="semibold" color="fg.subtle">
              Telemetry
            </Text>
            <Text fontWeight="semibold">
              {telemetryConnected ? 'Live' : 'Offline'}
            </Text>
          </HStack>
        </Tooltip>
        <Text fontSize="lg" fontWeight="semibold" color="fg.default">
          Global Controls
        </Text>
      </HStack>

      <ButtonGroup size="sm" isAttached variant="outline">
        <Button
          onClick={async () => { await onMute(); }}
          isLoading={loadingCommand === 'mute'}
          loadingText="Muting"
          colorScheme="red"
        >
          Mute All
        </Button>
        <Button
          onClick={async () => { await onUnmute(); }}
          isLoading={loadingCommand === 'unmute'}
          loadingText="Unmuting"
          colorScheme="green"
        >
          Unmute All
        </Button>
      </ButtonGroup>

      <ButtonGroup size="sm" variant="solid">
        {scenePresets.map((scene, index) => (
          <Button
            key={`${scene}-${index}`}
            onClick={async () => { await onSetScene(scene); }}
            isLoading={loadingCommand === scene}
            loadingText="Applying"
            colorScheme="brand"
            isDisabled={!scene.length}
          >
            {scene}
          </Button>
        ))}
      </ButtonGroup>

      <Spacer />

      <Button size="sm" variant="ghost" colorScheme="brand" onClick={onOpenSettings}>
        Settings
      </Button>
      <IconButton
        aria-label={toggleLabel}
        size="sm"
        variant="ghost"
        colorScheme="brand"
        icon={colorMode === 'light' ? <MoonIcon /> : <SunIcon />}
        onClick={toggleColorMode}
      />
    </Flex>
  );
};

export default ControlBar;
