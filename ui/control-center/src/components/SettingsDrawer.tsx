import {
  Badge,
  Box,
  Button,
  Drawer,
  DrawerBody,
  DrawerCloseButton,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerOverlay,
  FormControl,
  FormLabel,
  HStack,
  Input,
  NumberInput,
  NumberInputField,
  Switch,
  Table,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
  VStack
} from '@chakra-ui/react';
import type { GlobalSettings, ObsConnectionSettings, SettingsPayload } from '@control-center/shared';
import { useEffect, useState } from 'react';

type SettingsDrawerProps = {
  isOpen: boolean;
  onClose: () => void;
  connections: ObsConnectionSettings[];
  global: GlobalSettings;
  onSubmit: (payload: SettingsPayload) => Promise<void>;
  submitting: boolean;
};

const SettingsDrawer = ({
  isOpen,
  onClose,
  connections,
  global,
  onSubmit,
  submitting
}: SettingsDrawerProps) => {
  const [connectionState, setConnectionState] = useState<ObsConnectionSettings[]>(connections);
  const [scenePresets, setScenePresets] = useState<string[]>(global.scenePresets);

  useEffect(() => {
    setConnectionState(connections);
  }, [connections]);

  useEffect(() => {
    setScenePresets(global.scenePresets);
  }, [global.scenePresets]);

  const updateField = <T extends keyof ObsConnectionSettings>(
    index: number,
    field: T,
    value: ObsConnectionSettings[T]
  ) => {
    setConnectionState((prev) => {
      return prev.map((item, idx) => (idx === index ? { ...item, [field]: value } : item));
    });
  };

  const handleSubmit = async () => {
    await onSubmit({
      connections: connectionState,
      global: { scenePresets }
    });
    onClose();
  };

  return (
    <Drawer isOpen={isOpen} placement="right" onClose={onClose} size="xl">
      <DrawerOverlay />
      <DrawerContent>
        <DrawerCloseButton />
        <DrawerHeader>OBS Connections</DrawerHeader>

        <DrawerBody>
          <VStack align="stretch" spacing={6}>
            <Box>
              <Text color="gray.500" fontSize="sm">
                Configure up to 20 OBS WebSocket servers. Leave a row disabled if unused. Aliases
                help identify each instance on the dashboard.
              </Text>
            </Box>

            <Table size="sm" variant="striped">
              <Thead>
                <Tr>
                  <Th>#</Th>
                  <Th>Alias</Th>
                  <Th>Host</Th>
                  <Th>Port</Th>
                  <Th>Password</Th>
                  <Th textAlign="center">Enabled</Th>
                </Tr>
              </Thead>
              <Tbody>
                {connectionState.map((connection, index) => (
                  <Tr key={connection.id}>
                    <Td>
                      <HStack spacing={2}>
                        <Badge>{connection.id}</Badge>
                      </HStack>
                    </Td>
                    <Td>
                      <Input
                        size="sm"
                        value={connection.alias ?? ''}
                        placeholder={`OBS ${connection.id}`}
                        onChange={(event) => {
                          updateField(index, 'alias', event.target.value);
                        }}
                      />
                    </Td>
                    <Td>
                      <Input
                        size="sm"
                        value={connection.host}
                        onChange={(event) => {
                          updateField(index, 'host', event.target.value);
                        }}
                      />
                    </Td>
                    <Td>
                      <NumberInput
                        size="sm"
                        min={1}
                        max={65535}
                        value={connection.port}
                        onChange={(_valueString, valueNumber) => {
                          updateField(index, 'port', Number.isNaN(valueNumber) ? 4455 : valueNumber);
                        }}
                      >
                        <NumberInputField />
                      </NumberInput>
                    </Td>
                    <Td>
                      <Input
                        size="sm"
                        type="password"
                        value={connection.password ?? ''}
                        onChange={(event) => {
                          updateField(index, 'password', event.target.value);
                        }}
                        placeholder="Optional"
                      />
                    </Td>
                    <Td textAlign="center">
                      <Switch
                        isChecked={connection.enabled}
                        onChange={(event) => {
                          updateField(index, 'enabled', event.target.checked);
                        }}
                      />
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>

            <Box>
              <FormControl display="flex" alignItems="center">
                <FormLabel htmlFor="enable-all" mb="0">
                  Enable all configured instances
                </FormLabel>
                <Switch
                  id="enable-all"
                  onChange={(event) => {
                    setConnectionState((prev) => {
                      return prev.map((item) => ({
                        ...item,
                        enabled: event.target.checked ? item.host.length > 0 : false
                      }));
                    });
                  }}
                />
              </FormControl>
            </Box>

            <Box>
              <FormControl>
                <FormLabel>Scene Presets</FormLabel>
                <Text color="gray.500" fontSize="sm" mb={2}>
                  Update the labels used for the scene buttons. Provide the exact scene names configured in OBS. Leave empty to disable a button.
                </Text>
                <VStack align="stretch" spacing={2}>
                  {scenePresets.map((scene, index) => (
                    <HStack key={`scene-${index}`} spacing={3} align="center">
                      <Badge minW="45px" textAlign="center">
                        {index + 1}
                      </Badge>
                      <Input
                        value={scene}
                        placeholder={`Scene ${index + 1}`}
                        onChange={(event) => {
                          setScenePresets((prev) => {
                            const next = [...prev];
                            next[index] = event.target.value;
                            return next;
                          });
                        }}
                      />
                    </HStack>
                  ))}
                </VStack>
              </FormControl>
            </Box>
          </VStack>
        </DrawerBody>

        <DrawerFooter>
          <HStack spacing={3}>
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button colorScheme="blue" onClick={handleSubmit} isLoading={submitting}>
              Save
            </Button>
          </HStack>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
};

export default SettingsDrawer;
