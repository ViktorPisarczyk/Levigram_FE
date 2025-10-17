import React, {
  FC,
  useMemo,
  useRef,
  useState,
  useEffect,
  FormEvent,
  ChangeEvent,
} from "react";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { BsCheckLg, BsThreeDots } from "react-icons/bs";
import {
  FaRegComment,
  FaRegCommentDots,
  FaRegHeart,
  FaHeart,
} from "react-icons/fa";
import { IoMdSend } from "react-icons/io";
import { useSelector } from "react-redux";
import { RootState } from "../../redux/store";
import defaultAvatar from "../../assets/images/defaultAvatar.png";
import Avatar from "../Avatar/Avatar";
import "./Post.scss";
import MediaCarousel from "../MediaCarousel/MediaCarousel";
import { useClickOutside } from "../../hooks/useClickOutside";
import ConfirmModal from "../ConfirmModal/ConfirmModal";
import PostEditForm from "./PostEditForm";

import {
  useToggleLikeMutation,
  useGetLikesQuery,
  useGetCommentsQuery,
  useAddCommentMutation,
  useEditCommentMutation,
  useDeleteCommentMutation,
  useDeletePostMutation,
} from "../../redux/apiSlice";

import type { FeedItem, Comment as CommentType } from "../../types/models";

dayjs.extend(relativeTime);

const formatDate = (iso: string) => {
  const now = dayjs();
  const d = dayjs(iso);
  if (now.diff(d, "hour") < 24) return d.fromNow();
  return d.format("DD.MM.YYYY");
};

export interface PostComponentProps {
  post: FeedItem;
  onEdit?: () => void;
}

/* ------- CommentForm ------- */
const CommentForm: FC<{ postId: string }> = ({ postId }) => {
  const [text, setText] = useState("");
  const [addComment, { isLoading }] = useAddCommentMutation();
  const { user } = useSelector((s: RootState) => s.auth);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!text.trim() || !user) return;
    await addComment({ postId, text }).unwrap().catch(console.warn);
    setText("");
  };

  return (
    <form onSubmit={onSubmit} className="comment-form">
      <input
        type="text"
        placeholder="Schreibe einen Kommentar..."
        value={text}
        onChange={(e: ChangeEvent<HTMLInputElement>) => setText(e.target.value)}
      />
      <button type="submit" className="send-button" disabled={isLoading}>
        <IoMdSend className="send-icon" />
      </button>
    </form>
  );
};

/* ------- Comments ------- */
const CommentsList: FC<{ postId: string }> = ({ postId }) => {
  const { data: comments = [], isFetching } = useGetCommentsQuery(postId);
  const [editComment] = useEditCommentMutation();
  const [deleteComment] = useDeleteCommentMutation();
  const { user } = useSelector((s: RootState) => s.auth);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [editText]);

  const dropdownRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (
        openDropdownId &&
        dropdownRefs.current[openDropdownId] &&
        !dropdownRefs.current[openDropdownId]?.contains(e.target as Node)
      ) {
        setOpenDropdownId(null);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [openDropdownId]);

  if (isFetching) return <div className="comments-list">Lade Kommentare…</div>;
  if (!Array.isArray(comments))
    return <div className="comments-list">Keine Kommentare.</div>;

  return (
    <div className="comments-list">
      {comments
        .slice()
        .reverse()
        .map((comment: CommentType) => {
          const isOwner = user?._id === comment.user._id;
          const displayUsername = isOwner
            ? user?.username
            : comment.user.username;
          const displayProfilePicture = isOwner
            ? user?.profilePicture || defaultAvatar
            : comment.user.profilePicture || defaultAvatar;

          return (
            <div key={comment._id} className="comment-container">
              <div className="comment-content">
                <div className="comment-header">
                  <img
                    className="comment-profile-pic"
                    src={displayProfilePicture}
                    alt="profile"
                  />
                  <div className="comment-author-meta">
                    <strong>{displayUsername}</strong>
                    <small>{formatDate(comment.createdAt)}</small>
                  </div>

                  {isOwner && (
                    <div
                      className="comment-options"
                      ref={(el) => {
                        dropdownRefs.current[comment._id] = el;
                      }}
                    >
                      <button
                        className="dropdown-toggle"
                        onClick={() =>
                          setOpenDropdownId((p) =>
                            p === comment._id ? null : comment._id
                          )
                        }
                      >
                        <BsThreeDots />
                      </button>

                      {openDropdownId === comment._id && (
                        <div className="dropdown-menu">
                          <button
                            onClick={() => {
                              setEditingId(comment._id);
                              setEditText(comment.text);
                              setOpenDropdownId(null);
                            }}
                          >
                            Bearbeiten
                          </button>
                          <button
                            onClick={() => {
                              setConfirmDeleteId(comment._id);
                              setOpenDropdownId(null);
                            }}
                          >
                            Löschen
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="comment-text">
                  {editingId === comment._id ? (
                    <div className="comment-edit">
                      <div className="edit-container">
                        <textarea
                          ref={textareaRef}
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          rows={1}
                          className="auto-resize-textarea"
                        />
                        <button
                          onClick={async () => {
                            if (!editText.trim()) return;
                            await editComment({
                              commentId: comment._id,
                              postId,
                              text: editText,
                            })
                              .unwrap()
                              .catch(console.warn);
                            setEditingId(null);
                            setEditText("");
                          }}
                          className="edit-button"
                        >
                          <BsCheckLg className="check-icon" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p>{comment.text}</p>
                  )}
                </div>
              </div>

              {confirmDeleteId === comment._id && (
                <ConfirmModal
                  message="Bist du sicher, dass Du diesen Kommentar löschen möchtest?"
                  onCancel={() => setConfirmDeleteId(null)}
                  onConfirm={async () => {
                    await deleteComment({ postId, commentId: comment._id })
                      .unwrap()
                      .catch(console.warn);
                    setConfirmDeleteId(null);
                  }}
                />
              )}
            </div>
          );
        })}
    </div>
  );
};

/* ------- Post ------- */
const PostComponent: FC<PostComponentProps> = ({ post, onEdit }) => {
  const { user } = useSelector((s: RootState) => s.auth);

  const [toggleLike] = useToggleLikeMutation();
  const { data: likesData, isFetching: likesLoading } = useGetLikesQuery(
    post._id,
    {
      // Nur laden, wenn Liste geöffnet wird – wir steuern das unten
      skip: true,
    }
  );
  const [deletePost] = useDeletePostMutation();

  const [showDropDown, setShowDropDown] = useState(false);
  const [showCommentForm, setShowCommentForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  type Liker = { _id: string; username: string; profilePicture?: string };
  const [likesOpen, setLikesOpen] = useState(false);
  const [likers, setLikers] = useState<Liker[] | null>(null);
  const [loadingLikes, setLoadingLikes] = useState(false);

  const hasLiked = useMemo(
    () => !!user && post.likes.includes(user._id),
    [user, post]
  );

  const postOptionsRef = useRef<HTMLDivElement>(null);
  useClickOutside(postOptionsRef, () => setShowDropDown(false));

  const handleLike = async () => {
    if (!user) return;
    await toggleLike({ postId: post._id, userId: user._id })
      .unwrap()
      .catch(console.warn);
  };

  const likesRef = useRef<HTMLDivElement>(null);
  const likesToggleRef = useRef<HTMLButtonElement>(null);
  const commentRef = useRef<HTMLDivElement>(null);
  const commentToggleRef = useRef<HTMLButtonElement>(null);

  useClickOutside(
    likesRef,
    () => likesOpen && setLikesOpen(false),
    likesToggleRef,
    {
      dragTolerance: 12,
      enabled: true,
    }
  );
  useClickOutside(
    commentRef,
    () => showCommentForm && setShowCommentForm(false),
    commentToggleRef,
    {
      dragTolerance: 12,
      enabled: true,
    }
  );

  const toggleLikes = async () => {
    const next = !likesOpen;
    setLikesOpen(next);
    if (next) setShowCommentForm(false);
    if (next && likers == null) {
      try {
        setLoadingLikes(true);
        // Kleiner pragmatischer Call ohne extra Hook, um nicht unnötig Daten vorzuhalten:
        const res = await fetch(`/posts/${post._id}/likes`, {
          headers: { "Content-Type": "application/json" },
          credentials: "include",
        });
        const data = await res.json();
        if (res.ok) setLikers(data.likes || []);
      } catch (e) {
        console.error("Failed to fetch likes:", e);
      } finally {
        setLoadingLikes(false);
      }
    }
  };

  const isOwnPost = post.author._id === user?._id;
  const avatar =
    isOwnPost && user?.profilePicture
      ? user.profilePicture
      : post.author?.profilePicture || defaultAvatar;
  const displayName = isOwnPost ? user?.username : post.author.username;

  return (
    <div className="post-container">
      <div className="post-header">
        <div className="author-info">
          <Avatar src={avatar} alt={displayName} size={40} />
          <div className="author-text">
            <strong>{displayName}</strong>
            <small>{formatDate(post.createdAt)}</small>
          </div>
        </div>

        {isOwnPost && (
          <div className="post-options" ref={postOptionsRef}>
            <button
              onClick={() => setShowDropDown((prev) => !prev)}
              className="dropdown-toggle"
              aria-label="Post-Optionen"
              title="Post-Optionen"
            >
              <BsThreeDots />
            </button>

            {showDropDown && (
              <div className="dropdown-menu">
                <button
                  onClick={() => {
                    setShowDropDown(false);
                    if (onEdit) {
                      onEdit();
                    } else {
                      setIsEditing(true);
                    }
                  }}
                >
                  Bearbeiten
                </button>
                <button
                  onClick={() => {
                    setShowDropDown(false);
                    setShowConfirm(true);
                  }}
                >
                  Löschen
                </button>
              </div>
            )}

            {showConfirm && (
              <ConfirmModal
                message="Are you sure that you want to delete this post?"
                onCancel={() => setShowConfirm(false)}
                onConfirm={async () => {
                  await deletePost(post._id).unwrap().catch(console.warn);
                  setShowConfirm(false);
                }}
              />
            )}
          </div>
        )}
      </div>

      {/* Wenn onEdit übergeben wird, rendere nie die lokale EditForm */}
      {isEditing && !onEdit ? (
        <PostEditForm post={post} onCancel={() => setIsEditing(false)} />
      ) : (
        <>
          <p className="post-description">{post.content}</p>
          {post.media.length > 0 && <MediaCarousel media={post.media} />}
        </>
      )}

      <div className="post-meta-bar">
        <button
          type="button"
          ref={likesToggleRef}
          className={`meta-button ${hasLiked ? "is-liked" : ""}`}
          onClick={toggleLikes}
          aria-expanded={likesOpen}
          aria-controls={`likes-panel-${post._id}`}
          title="Likes anzeigen"
        >
          <span
            className="like-hit"
            onClick={(e) => {
              e.stopPropagation();
              handleLike();
            }}
            role="button"
            aria-label={hasLiked ? "Gefällt mir entfernen" : "Gefällt mir"}
            title={hasLiked ? "Gefällt mir entfernen" : "Gefällt mir"}
          >
            {hasLiked ? (
              <FaHeart className="icon-heart liked" />
            ) : (
              <FaRegHeart className="icon-heart" />
            )}
          </span>

          <span className="meta-count">{post.likes.length}</span>

          <svg
            viewBox="0 0 24 24"
            width="16"
            height="16"
            className={`icon-chevron ${likesOpen ? "rot" : ""}`}
            aria-hidden="true"
          >
            <path d="M6 9l6 6 6-6" fill="currentColor" />
          </svg>
        </button>

        <button
          type="button"
          ref={commentToggleRef}
          className={`meta-button ${
            post.comments?.length ? "has-comments" : ""
          }`}
          onClick={() => {
            const next = !showCommentForm;
            setShowCommentForm(next);
            if (next) setLikesOpen(false);
          }}
          aria-expanded={showCommentForm}
          title="Kommentare anzeigen"
        >
          {post.comments?.length ? (
            <FaRegCommentDots className="icon-comment" />
          ) : (
            <FaRegComment className="icon-comment" />
          )}
          <span className="meta-count">{post.comments?.length || 0}</span>
          <svg
            viewBox="0 0 24 24"
            width="16"
            height="16"
            className={`icon-chevron ${showCommentForm ? "rot" : ""}`}
            aria-hidden="true"
          >
            <path d="M6 9l6 6 6-6" fill="currentColor" />
          </svg>
        </button>
      </div>

      <div
        id={`likes-panel-${post._id}`}
        ref={likesRef}
        className={`likes-panel ${likesOpen ? "open" : ""}`}
        role="region"
        aria-label="Liste der Likes"
      >
        {loadingLikes && <div className="likes-loading">Lade Likes…</div>}
        {!loadingLikes && likers && likers.length === 0 && (
          <div className="likes-empty">Noch keine Likes</div>
        )}
        {!loadingLikes && likers && likers.length > 0 && (
          <ul className="likes-list">
            {likers.map((u) => (
              <li key={u._id} className="likes-item">
                <Avatar
                  src={u.profilePicture || defaultAvatar}
                  alt={u.username}
                  size="sm"
                  className="likes-avatar"
                />

                <span className="likes-name">{u.username}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {showCommentForm && (
        <div className="comment-section" ref={commentRef}>
          <CommentForm postId={post._id} />
          <CommentsList postId={post._id} />
        </div>
      )}
    </div>
  );
};

export default PostComponent;
