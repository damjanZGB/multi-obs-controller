import {
  Badge,
  Box,
  Flex,
  Grid,
  GridItem,
  Heading,
  Progress,
  Stat,
  StatHelpText,
  StatLabel,
  StatNumber,
  Text,
  Tooltip,
  useColorModeValue
} from '@chakra-ui/react';
import type { ObsTelemetry } from '@control-center/shared';

const formatNumber = (value?: number, fractionDigits = 1) =>
  typeof value === 'number' ? value.toFixed(fractionDigits) : '—';

const mapStreamState = (state?: string) => {
  switch (state) {
    case 'live':
      return { label: 'Streaming', colorScheme: 'green' as const };
    case 'offline':
      return { label: 'Stopped', colorScheme: 'gray' as const };
    case 'error':
      return { label: 'Error', colorScheme: 'red' as const };
    default:
      return { label: 'Unknown', colorScheme: 'orange' as const };
  }
};

const mapRecordState = (state?: string) => {
  switch (state) {
    case 'recording':
      return { label: 'Recording', colorScheme: 'green' as const };
    case 'paused':
      return { label: 'Paused', colorScheme: 'yellow' as const };
    case 'stopped':
      return { label: 'Stopped', colorScheme: 'gray' as const };
    case 'error':
      return { label: 'Error', colorScheme: 'red' as const };
    default:
      return { label: 'Unknown', colorScheme: 'orange' as const };
  }
};

const dbToLevel = (db?: number) => {
  if (typeof db !== 'number') return 0;
  const clamped = Math.max(-60, Math.min(0, db));
  const amplitude = Math.pow(10, clamped / 20);
  return Math.round(amplitude * 100);
};

type TelemetryCardProps = {
  telemetry: ObsTelemetry;
};

const TelemetryCard = ({ telemetry }: TelemetryCardProps) => {
  const { label: streamLabel, colorScheme: streamColor } = mapStreamState(telemetry.streamState);
  const { label: recordLabel, colorScheme: recordColor } = mapRecordState(telemetry.recordState);
  const isConnected = telemetry.connected;
  const containerBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');

  return (
    <Box
      borderWidth="1px"
      borderColor={borderColor}
      borderRadius="lg"
      p={4}
      bg={containerBg}
      shadow="lg"
      transition="transform 0.2s ease"
      transform={isConnected ? 'none' : 'scale(0.98)'}
    >
      <Flex justify="space-between" align="center" mb={3}>
        <Heading size="sm">
          {telemetry.alias?.length ? telemetry.alias : `OBS #${telemetry.id}`}
        </Heading>
        <Badge colorScheme={isConnected ? 'green' : 'red'}>
          {isConnected ? 'Connected' : 'Offline'}
        </Badge>
      </Flex>

      <Grid templateColumns="repeat(2, 1fr)" gap={3}>
        <GridItem>
          <Stat>
            <StatLabel>CPU</StatLabel>
            <StatNumber>{formatNumber(telemetry.cpuUsage)}%</StatNumber>
          </Stat>
        </GridItem>
        <GridItem>
          <Stat>
            <StatLabel>Audio</StatLabel>
            <StatNumber>{formatNumber(telemetry.audioLevelDb, 1)} dB</StatNumber>
          </Stat>
        </GridItem>

        <GridItem>
          <Stat>
            <StatLabel>Stream Frames</StatLabel>
            <StatNumber>{telemetry.streamDroppedFrames ?? '—'}</StatNumber>
            <StatHelpText>Dropped</StatHelpText>
          </Stat>
        </GridItem>
        <GridItem>
          <Stat>
            <StatLabel>Record Frames</StatLabel>
            <StatNumber>{telemetry.recordDroppedFrames ?? '—'}</StatNumber>
            <StatHelpText>Dropped</StatHelpText>
          </Stat>
        </GridItem>
      </Grid>

      <Flex justify="space-between" my={3}>
        <Badge colorScheme={streamColor} variant="solid">
          {streamLabel}
        </Badge>
        <Badge colorScheme={recordColor} variant="outline">
          {recordLabel}
        </Badge>
      </Flex>

      <Box mt={3}>
        <Flex justify="space-between" mb={1}>
          <Text fontSize="sm" color="gray.500">
            Audio Level
          </Text>
          <Tooltip
            hasArrow
            label={
              telemetry.lastHeartbeat
                ? `Last update ${new Date(telemetry.lastHeartbeat).toLocaleTimeString()}`
                : 'No data'
            }
          >
            <Text fontSize="xs" color="gray.500">
              {telemetry.lastHeartbeat ? 'Live' : 'Awaiting'}
            </Text>
          </Tooltip>
        </Flex>
        <Progress
          value={dbToLevel(telemetry.audioLevelDb)}
          size="sm"
          colorScheme={telemetry.audioLevelDb && telemetry.audioLevelDb > -12 ? 'red' : 'blue'}
          borderRadius="sm"
        />
      </Box>
    </Box>
  );
};

export default TelemetryCard;
