import type { Meta, StoryObj } from '@storybook/react';
import { SearchInput } from '@mmtm/components';
import { useState } from 'react';

const meta: Meta<typeof SearchInput> = {
  title: 'Components/SearchInput',
  component: SearchInput,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{ width: '400px' }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    placeholder: 'Search repositories...',
  },
};

export const WithValue: Story = {
  args: {
    value: 'react',
    placeholder: 'Search...',
  },
};

export const WithoutClearButton: Story = {
  args: {
    value: 'search term',
    showClearButton: false,
  },
};

export const WithCallbacks: Story = {
  args: {
    placeholder: 'Press Enter to search',
    onChange: (value) => console.log('Changed:', value),
    onSearch: (value) => console.log('Search:', value),
    onClear: () => console.log('Cleared'),
  },
};

export const Controlled: Story = {
  render: () => {
    const ControlledExample = () => {
      const [searchValue, setSearchValue] = useState('');
      const [results, setResults] = useState<string[]>([]);

      const handleSearch = (value: string) => {
        if (value) {
          setResults([
            `Result for "${value}" 1`,
            `Result for "${value}" 2`,
            `Result for "${value}" 3`,
          ]);
        } else {
          setResults([]);
        }
      };

      return (
        <div>
          <SearchInput
            value={searchValue}
            onChange={setSearchValue}
            onSearch={handleSearch}
            placeholder="Type and press Enter..."
          />
          {results.length > 0 && (
            <div style={{ marginTop: '16px', padding: '12px', background: '#f7fafc', borderRadius: '8px' }}>
              <div style={{ fontSize: '14px', fontWeight: 500, marginBottom: '8px' }}>Search Results:</div>
              {results.map((result, i) => (
                <div key={i} style={{ fontSize: '14px', color: '#64748b', marginBottom: '4px' }}>
                  • {result}
                </div>
              ))}
            </div>
          )}
        </div>
      );
    };
    return <ControlledExample />;
  },
};

export const CustomPlaceholder: Story = {
  args: {
    placeholder: 'Filter team members by name...',
  },
};

export const Disabled: Story = {
  args: {
    placeholder: 'Search disabled',
    disabled: true,
  },
};