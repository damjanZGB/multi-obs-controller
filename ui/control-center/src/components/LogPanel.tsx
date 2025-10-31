import {
  Badge,
  Box,
  Flex,
  Text,
  useColorModeValue
} from '@chakra-ui/react';
import type { LogEntry } from '@control-center/shared';

type LogPanelProps = {
  logs: LogEntry[];
};

const levelColor: Record<LogEntry['level'], string> = {
  info: 'blue',
  warn: 'yellow',
  error: 'red'
};

const LogPanel = ({ logs }: LogPanelProps) => {
  const bg = useColorModeValue('gray.50', 'gray.800');
  const border = useColorModeValue('gray.200', 'gray.700');

  const content = logs.length === 0
    ? (
        <Text color="gray.500" textAlign="center">
          Awaiting events…
        </Text>
      )
    : (
        logs
          .slice()
          .reverse()
          .map((entry, index) => (
            <Flex key={`${entry.timestamp}-${index}`} align="center" mb={2} gap={3}>
              <Badge colorScheme={levelColor[entry.level]}>{entry.level.toUpperCase()}</Badge>
              <Text fontSize="sm" color="gray.400" minW="120px">
                {new Date(entry.timestamp).toLocaleTimeString()}
              </Text>
              <Text fontSize="sm">{entry.message}</Text>
            </Flex>
          ))
      );

  return (
    <Box
      borderWidth="1px"
      borderColor={border}
      borderRadius="lg"
      bg={bg}
      p={4}
      maxH="260px"
      overflowY="auto"
    >
      {content}
    </Box>
  );
};

export default LogPanel;
