import PostComponent from "./Post";

export default {
  title: "Components/Post",
  component: PostComponent,
};

const mockPost = {
  _id: "p1",
  author: { _id: "u1", username: "Viktor", profilePicture: undefined },
  content: "Das ist ein Beispiel-Post für Storybook.",
  media: [{ url: "/screenshots/Profile.png" }],
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

export const Default = () => <PostComponent post={mockPost as any} />;
