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
  Tooltip
} from '@chakra-ui/react';
import type { ObsTelemetry } from '@control-center/shared';

const formatNumber = (value?: number, fractionDigits = 1) =>
  typeof value === 'number' ? value.toFixed(fractionDigits) : '--';

const mapStreamState = (state?: string) => {
  switch (state) {
    case 'live':
      return { label: 'Streaming', colorScheme: 'green' as const };
    case 'offline':
      return { label: 'Stopped', colorScheme: 'gray' as const };
    case 'error':
      return { label: 'Error', colorScheme: 'red' as const };
    default:
      return { label: 'Unknown', colorScheme: 'gray' as const };
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
      return { label: 'Unknown', colorScheme: 'gray' as const };
  }
};

const dbToLevel = (db?: number) => {
  if (typeof db !== 'number') return 0;
  const clamped = Math.max(-60, Math.min(0, db));
  return Math.round(((clamped + 60) / 60) * 100);
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
  const paletteKey = telemetry.lastError || commandIssue
    ? 'error'
    : isConnected
      ? 'connected'
      : 'offline';
  const surfaceColor = `card.${paletteKey}.bg` as const;
  const borderColor = `card.${paletteKey}.border` as const;
  const overlayColor = `card.${paletteKey}.overlay` as const;
  const headingColor = paletteKey === 'offline' ? 'fg.subtle' : 'fg.default';
  const bodyColor = paletteKey === 'offline' ? 'fg.subtle' : 'fg.default';
  const statusBadgeScheme = paletteKey === 'error' ? 'red' : paletteKey === 'offline' ? 'gray' : 'green';
  const statusBadgeVariant = paletteKey === 'connected' ? 'solid' : 'subtle';

  const droppedStream = telemetry.streamDroppedFrames ?? 0;
  const droppedRecord = telemetry.recordDroppedFrames ?? 0;
  const highStreamDrops = droppedStream > 0;
  const highRecordDrops = droppedRecord > 0;

  return (
    <Box
      borderWidth="1px"
      borderColor={borderColor}
      borderRadius="surface"
      p={{ base: 5, md: 6 }}
      bg={surfaceColor}
      color={bodyColor}
      shadow="surface"
      transition="transform 0.2s ease"
      transform={isConnected ? 'none' : 'scale(0.98)'}
      position="relative"
      overflow="hidden"
    >
      <Box
        position="absolute"
        inset={0}
        borderRadius="surface"
        bg={overlayColor}
        pointerEvents="none"
        zIndex={0}
      />

      <Box position="relative" zIndex={1}>
        <Flex justify="space-between" align="center" mb={3} position="relative">
          <Heading size="sm" color={headingColor}>
            {telemetry.alias?.length ? telemetry.alias : `OBS #${telemetry.id}`}
          </Heading>
          <Badge colorScheme={statusBadgeScheme} variant={statusBadgeVariant}>
            {telemetry.lastError || commandIssue ? 'Attention' : isConnected ? 'Active' : 'Offline'}
          </Badge>
        </Flex>

        {telemetry.lastError && (
          <Box mb={3} position="relative">
            <Badge colorScheme="red" mb={1}>
              Error
            </Badge>
            <Text fontSize="sm" color="white">
              {telemetry.lastError}
            </Text>
          </Box>
        )}

        {commandIssue && (
          <Box mb={3} position="relative">
            <Badge colorScheme="red" mb={1}>
              Recent Command Issue
            </Badge>
            <Text fontSize="sm" color="white">
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
                {telemetry.streamDroppedFrames ?? '--'}
              </StatNumber>
              <StatHelpText>Dropped</StatHelpText>
            </Stat>
          </GridItem>
          <GridItem>
            <Stat>
              <StatLabel>Record Frames</StatLabel>
              <StatNumber color={highRecordDrops ? 'orange.300' : undefined}>
                {telemetry.recordDroppedFrames ?? '--'}
              </StatNumber>
              <StatHelpText>Dropped</StatHelpText>
            </Stat>
          </GridItem>
        </Grid>

        <Flex justify="space-between" my={3} position="relative">
          <Badge colorScheme={streamColor} variant="subtle">
            {streamLabel}
          </Badge>
          <Badge colorScheme={recordColor} variant="subtle">
            {recordLabel}
          </Badge>
        </Flex>

        <Box mt={3} position="relative">
          <Flex justify="space-between" mb={1}>
            <Text fontSize="sm" color="fg.subtle">
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
              <Text fontSize="xs" color="fg.subtle">
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
    </Box>
  );
};

export default TelemetryCard;
