import { SimpleGrid, Box, Text } from '@chakra-ui/react';
import type { ObsTelemetry } from '@control-center/shared';
import TelemetryCard from './TelemetryCard';

type TelemetryGridProps = {
  telemetry: ObsTelemetry[];
};

const TelemetryGrid = ({ telemetry }: TelemetryGridProps) => {
  if (!telemetry.length) {
    return (
      <Box
        borderWidth="1px"
        borderColor="gray.700"
        borderRadius="lg"
        p={6}
        textAlign="center"
      >
        <Text color="gray.400">
          No telemetry available yet. Configure OBS instances to get started.
        </Text>
      </Box>
    );
  }

  return (
    <SimpleGrid spacing={4} columns={{ base: 1, md: 2, lg: 3, xl: 4 }}>
      {telemetry.map((item) => (
        <TelemetryCard key={item.id} telemetry={item} />
      ))}
    </SimpleGrid>
  );
};

export default TelemetryGrid;
