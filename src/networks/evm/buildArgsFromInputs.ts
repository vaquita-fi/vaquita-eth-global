export function buildArgsFromInputs(
  inputs: readonly { name?: string; type: string }[],
  values: Record<string, unknown>
): unknown[] {
  return inputs.map((input, index) => {
    if (!input.name) {
      console.warn(`ABI input at index ${index} has no name, skipping name lookup.`);
      return undefined;
    }
    if (!(input.name in values)) {
      throw new Error(`Missing value for input: ${input.name}`);
    }
    return values[input.name];
  });
}
