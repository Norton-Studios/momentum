import type { Meta, StoryObj } from "@storybook/react";
import { TeamMember } from "@mmtm/components";

const meta: Meta<typeof TeamMember> = {
  title: "Onboarding/TeamMember",
  component: TeamMember,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <div style={{ width: "300px" }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    name: "John Smith",
    role: "Senior Developer",
  },
};

export const WithAvatar: Story = {
  args: {
    name: "Sarah Johnson",
    role: "Team Lead",
    avatarUrl: "https://i.pravatar.cc/150?img=1",
  },
};

export const WithInitials: Story = {
  args: {
    name: "Mike Williams",
    initials: "MW",
    role: "DevOps Engineer",
  },
};

export const Online: Story = {
  args: {
    name: "Emily Chen",
    role: "Frontend Developer",
    status: "online",
  },
};

export const Offline: Story = {
  args: {
    name: "David Brown",
    role: "Backend Developer",
    status: "offline",
  },
};

export const Away: Story = {
  args: {
    name: "Lisa Anderson",
    role: "QA Engineer",
    status: "away",
  },
};

export const Small: Story = {
  args: {
    name: "Tom Wilson",
    role: "Junior Developer",
    size: "sm",
    status: "online",
  },
};

export const Large: Story = {
  args: {
    name: "Rachel Green",
    role: "Product Manager",
    size: "lg",
    status: "online",
  },
};

export const Clickable: Story = {
  args: {
    name: "Chris Martin",
    role: "Full Stack Developer",
    status: "online",
    onClick: () => console.log("Team member clicked!"),
  },
};

export const TeamList: Story = {
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px", width: "300px" }}>
      <TeamMember name="John Smith" initials="JS" status="online" />
      <TeamMember name="Mary Johnson" initials="MJ" status="online" />
      <TeamMember name="Robert Williams" initials="RW" status="away" />
      <TeamMember name="Sarah Kim" initials="SK" status="online" />
      <TeamMember name="Alex Lee" initials="AL" status="offline" />
      <TeamMember name="Diana Chen" initials="DC" status="online" />
    </div>
  ),
};
