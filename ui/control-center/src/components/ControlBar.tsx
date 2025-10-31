import {
  Button,
  ButtonGroup,
  Flex,
  HStack,
  IconButton,
  Spacer,
  Text,
  Tooltip,
  useColorMode,
  useColorModeValue
} from '@chakra-ui/react';
import { MoonIcon, SunIcon } from '@chakra-ui/icons';

type ControlBarProps = {
  onMute: () => Promise<void>;
  onUnmute: () => Promise<void>;
  onSetScene: (sceneName: string) => Promise<void>;
  loadingCommand?: string;
  telemetryConnected: boolean;
  onOpenSettings: () => void;
};

const scenes = ['Scene 1', 'Scene 2', 'Scene 3', 'Scene 4', 'Scene 5'];

const ControlBar = ({
  onMute,
  onUnmute,
  onSetScene,
  loadingCommand,
  telemetryConnected,
  onOpenSettings
}: ControlBarProps) => {
  const { colorMode, toggleColorMode } = useColorMode();
  const statusColor = telemetryConnected ? 'green.400' : 'red.400';
  const bg = useColorModeValue('gray.100', 'gray.800');

  return (
    <Flex
      align="center"
      wrap="wrap"
      gap={4}
      p={4}
      borderRadius="lg"
      bg={bg}
      borderWidth="1px"
      borderColor={useColorModeValue('gray.200', 'gray.700')}
    >
      <HStack spacing={3}>
        <Tooltip label={telemetryConnected ? 'Telemetry live' : 'Telemetry disconnected'}>
          <Text fontWeight="bold" color={statusColor}>
            ●
          </Text>
        </Tooltip>
        <Text fontSize="lg" fontWeight="semibold">
          Global Controls
        </Text>
      </HStack>

      <ButtonGroup size="sm" isAttached variant="outline">
        <Button
          onClick={onMute}
          isLoading={loadingCommand === 'mute'}
          loadingText="Muting"
          colorScheme="red"
        >
          Mute All
        </Button>
        <Button
          onClick={onUnmute}
          isLoading={loadingCommand === 'unmute'}
          loadingText="Unmuting"
          colorScheme="green"
        >
          Unmute All
        </Button>
      </ButtonGroup>

      <ButtonGroup size="sm" variant="solid">
        {scenes.map((scene) => (
          <Button
            key={scene}
            onClick={() => onSetScene(scene)}
            isLoading={loadingCommand === scene}
            loadingText="Applying"
            colorScheme="blue"
          >
            {scene}
          </Button>
        ))}
      </ButtonGroup>

      <Spacer />

      <Button size="sm" variant="outline" onClick={onOpenSettings}>
        Settings
      </Button>
      <IconButton
        aria-label="Toggle color mode"
        size="sm"
        variant="ghost"
        icon={colorMode === 'light' ? <MoonIcon /> : <SunIcon />}
        onClick={toggleColorMode}
      />
    </Flex>
  );
};

export default ControlBar;
