import PostComponent from "./Post";
import storyMedia from "../../assets/images/istockphoto-887138350-612x612.jpg";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useLayoutEffect, useRef, type ComponentProps, type ReactNode } from "react";

type PostStoryArgs = ComponentProps<typeof PostComponent> & {
  theme: "light" | "dark";
};

const ThemePreview = ({
  theme,
  children,
}: {
  theme: "light" | "dark";
  children: ReactNode;
}) => {
  const initialTheme = useRef(document.body.getAttribute("data-theme"));

  useLayoutEffect(() => {
    document.body.setAttribute("data-theme", theme);

    return () => {
      if (initialTheme.current) {
        document.body.setAttribute("data-theme", initialTheme.current);
      } else {
        document.body.removeAttribute("data-theme");
      }
    };
  }, [theme]);

  return <div style={{ minHeight: "100vh", padding: 16 }}>{children}</div>;
};

const meta = {
  title: "Components/Post",
  component: PostComponent,
  argTypes: {
    theme: {
      name: "Farbschema",
      control: {
        type: "inline-radio",
        labels: { light: "Light", dark: "Dark" },
      },
      options: ["light", "dark"],
    },
    post: { control: false },
    onEdit: { control: false },
  },
  render: ({ theme, post }) => (
    <ThemePreview theme={theme}>
      <PostComponent post={post} />
    </ThemePreview>
  ),
} satisfies Meta<PostStoryArgs>;

export default meta;
type Story = StoryObj<typeof meta>;

const mockPost = {
  _id: "p1",
  author: { _id: "u1", username: "Viktor", profilePicture: undefined },
  content: "Das ist ein Beispiel-Post für Storybook.",
  media: [{ url: storyMedia }],
  likes: ["1", "2", "3"],
  comments: [
    {
      _id: "c1",
      author: { _id: "u2", username: "Alice", profilePicture: undefined },
      content: "hallo",
      createdAt: new Date().toISOString(),
    },
    {
      _id: "c2",
      author: { _id: "u3", username: "Bob", profilePicture: undefined },
      content: "wie geht's?",
      createdAt: new Date().toISOString(),
    },
  ],
  createdAt: new Date().toISOString(),
};

export const Default: Story = {
  args: { theme: "light", post: mockPost as any },
};
