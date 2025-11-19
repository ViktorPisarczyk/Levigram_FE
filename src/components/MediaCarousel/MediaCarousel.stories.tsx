import MediaCarousel from "./MediaCarousel";

export default {
  title: "Components/MediaCarousel",
  component: MediaCarousel,
};

const sampleMedia = [
  { url: "/screenshots/CreateAccount.png" },
  { url: "/screenshots/CreatePost.png" },
  { url: "/screenshots/LoginPage.png" },
  { url: "/screenshots/Profile.png" },
  { url: "/screenshots/Search.png" },
];

export const Default = () => <MediaCarousel media={sampleMedia} />;
