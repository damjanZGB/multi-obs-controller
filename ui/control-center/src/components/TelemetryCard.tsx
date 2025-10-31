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

type CommandIssue = { reason: string; timestamp: number };

type TelemetryCardProps = {
  telemetry: ObsTelemetry;
  commandIssue?: CommandIssue;
};

const TelemetryCard = ({ telemetry, commandIssue }: TelemetryCardProps) => {
  const { label: streamLabel, colorScheme: streamColor } = mapStreamState(telemetry.streamState);
  const { label: recordLabel, colorScheme: recordColor } = mapRecordState(telemetry.recordState);
  const isConnected = telemetry.connected;
  const containerBg = useColorModeValue('white', 'gray.800');
  const baseBorder = useColorModeValue('gray.200', 'gray.700');

  const severity = (() => {
    if (!isConnected) return { border: 'red.500', overlay: 'red.900' };
    if (telemetry.lastError) return { border: 'red.400', overlay: 'red.900' };
    if (commandIssue) return { border: 'orange.400', overlay: 'orange.900' };
    if ((telemetry.cpuUsage ?? 0) > 85) return { border: 'orange.300', overlay: 'orange.800' };
    return { border: baseBorder, overlay: undefined };
  })();

  const droppedStream = telemetry.streamDroppedFrames ?? 0;
  const droppedRecord = telemetry.recordDroppedFrames ?? 0;
  const highStreamDrops = droppedStream > 0;
  const highRecordDrops = droppedRecord > 0;

  return (
    <Box
      borderWidth="1px"
      borderColor={severity.border}
      borderRadius="lg"
      p={4}
      bg={containerBg}
      shadow="lg"
      transition="transform 0.2s ease"
      transform={isConnected ? 'none' : 'scale(0.98)'}
      position="relative"
    >
      {severity.overlay && (
        <Box
          position="absolute"
          inset={0}
          borderRadius="lg"
          opacity={0.12}
          bg={severity.overlay}
          pointerEvents="none"
        />
      )}

      <Flex justify="space-between" align="center" mb={3} position="relative">
        <Heading size="sm">
          {telemetry.alias?.length ? telemetry.alias : `OBS #${telemetry.id}`}
        </Heading>
        <Badge colorScheme={isConnected ? 'green' : 'red'}>
          {isConnected ? 'Connected' : 'Offline'}
        </Badge>
      </Flex>

      {telemetry.lastError && (
        <Box mb={3} position="relative">
          <Badge colorScheme="red" mb={1}>
            Error
          </Badge>
          <Text fontSize="sm" color="red.200">
            {telemetry.lastError}
          </Text>
        </Box>
      )}

      {commandIssue && (
        <Box mb={3} position="relative">
          <Badge colorScheme="orange" mb={1}>
            Recent Command Issue
          </Badge>
          <Text fontSize="sm" color="orange.200">
            {commandIssue.reason}
          </Text>
        </Box>
      )}

      <Grid templateColumns="repeat(2, 1fr)" gap={3} position="relative">
        <GridItem>
          <Stat>
            <StatLabel>CPU</StatLabel>
            <StatNumber color={(telemetry.cpuUsage ?? 0) > 85 ? 'orange.300' : undefined}>
              {formatNumber(telemetry.cpuUsage)}%
            </StatNumber>
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
            <StatNumber color={highStreamDrops ? 'orange.300' : undefined}>
              {telemetry.streamDroppedFrames ?? '—'}
            </StatNumber>
            <StatHelpText>Dropped</StatHelpText>
          </Stat>
        </GridItem>
        <GridItem>
          <Stat>
            <StatLabel>Record Frames</StatLabel>
            <StatNumber color={highRecordDrops ? 'orange.300' : undefined}>
              {telemetry.recordDroppedFrames ?? '—'}
            </StatNumber>
            <StatHelpText>Dropped</StatHelpText>
          </Stat>
        </GridItem>
      </Grid>

      <Flex justify="space-between" my={3} position="relative">
        <Badge colorScheme={streamColor} variant="solid">
          {streamLabel}
        </Badge>
        <Badge colorScheme={recordColor} variant="outline">
          {recordLabel}
        </Badge>
      </Flex>

      <Box mt={3} position="relative">
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
