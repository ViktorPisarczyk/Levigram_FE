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

export const WithVideo = () => (
  <MediaCarousel
    media={[
      { url: "/screenshots/CreateAccount.png" },
      // Public sample mp4 (CORS-friendly) - replace if you prefer another
      {
        url: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
      },
    ]}
  />
);
