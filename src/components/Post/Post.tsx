import React, {
  useState,
  useEffect,
  useRef,
  FC,
  FormEvent,
  ChangeEvent,
} from "react";
import {
  toggleLikeAsync,
  addCommentAsync,
  editCommentAsync,
  deleteCommentAsync,
  selectPostById,
  Comment as CommentType,
  deletePostAsync,
} from "./postSlice";
import { RootState, AppDispatch } from "../../redux/store";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { BsCheckLg, BsThreeDots } from "react-icons/bs";
import { FaRegComment, FaRegHeart, FaHeart } from "react-icons/fa";
import { IoMdSend } from "react-icons/io";
import defaultAvatar from "../../assets/images/defaultAvatar.png";
import "./Post.scss";
import MediaCarousel from "../MediaCarousel/MediaCarousel";
import { useClickOutside } from "../../hooks/useClickOutside";
import PostEditForm from "./PostEditForm";
import ConfirmModal from "../ConfirmModal/ConfirmModal";

dayjs.extend(relativeTime);

const formatDate = (dateString: string) => {
  const now = dayjs();
  const date = dayjs(dateString);
  const diffInHours = now.diff(date, "hour");

  if (diffInHours < 24) {
    return date.fromNow();
  } else {
    return date.format("DD.MM.YYYY");
  }
};

interface PostComponentProps {
  postId: string;
}

// ---------- CommentForm ----------
const CommentForm: FC<{ postId: string }> = ({ postId }) => {
  const dispatch = useDispatch<AppDispatch>();
  const [text, setText] = useState("");
  const { user } = useSelector((state: RootState) => state.auth);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (text.trim()) {
      const newComment: CommentType = {
        _id: Date.now().toString(),
        postId,
        user: {
          _id: user._id,
          username: user.username,
          profilePicture: user.profilePicture || "unknown",
        },
        text,
        createdAt: new Date().toISOString(),
      };

      dispatch(addCommentAsync({ postId, text }));
      setText("");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="comment-form">
      <input
        type="text"
        placeholder="Schreibe einen Kommentar..."
        value={text}
        onChange={(e: ChangeEvent<HTMLInputElement>) => setText(e.target.value)}
      />
      <button type="submit" className="send-button">
        <IoMdSend className="send-icon" />
      </button>
    </form>
  );
};

// ---------- Comment ----------
const Comment: FC<{ comments?: CommentType[]; postId: string }> = ({
  comments = [],
  postId,
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((state: RootState) => state.auth);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [commentToDeleteId, setCommentToDeleteId] = useState<string | null>(
    null
  );

  const toggleDropdown = (commentId: string) => {
    setOpenDropdownId((prev) => (prev === commentId ? null : commentId));
  };

  const startEdit = (commentId: string, currentText: string) => {
    setEditingId(commentId);
    setEditText(currentText);
    setOpenDropdownId(null);
  };

  const confirmEdit = () => {
    if (editingId && editText.trim()) {
      dispatch(
        editCommentAsync({ commentId: editingId, postId, newText: editText })
      );
      setEditingId(null);
      setEditText("");
    }
  };

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [editText]);

  const dropdownRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        openDropdownId &&
        dropdownRefs.current[openDropdownId] &&
        !dropdownRefs.current[openDropdownId]?.contains(e.target as Node)
      ) {
        setOpenDropdownId(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [openDropdownId]);

  if (!Array.isArray(comments)) {
    return <div className="comments-list">No comments available.</div>;
  }

  return (
    <div className="comments-list">
      {comments.length > 0 &&
        comments
          .slice()
          .reverse()
          .map((comment) => {
            const isOwner = user?._id === comment.user._id;

            const displayUsername = isOwner
              ? user.username
              : comment.user.username;

            const displayProfilePicture = isOwner
              ? user.profilePicture || defaultAvatar
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
                          onClick={() => toggleDropdown(comment._id)}
                        >
                          <BsThreeDots />
                        </button>
                        {openDropdownId === comment._id && (
                          <div className="dropdown-menu">
                            <button
                              onClick={() =>
                                startEdit(comment._id, comment.text)
                              }
                            >
                              Bearbeiten
                            </button>
                            <button
                              onClick={() => {
                                setCommentToDeleteId(comment._id);
                                setShowConfirmDelete(true);
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
                          <button onClick={confirmEdit} className="edit-button">
                            <BsCheckLg className="check-icon" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p>{comment.text}</p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

      {showConfirmDelete && commentToDeleteId && (
        <ConfirmModal
          message="Bist du sicher, dass Du diesen Kommentar löschen möchtest?"
          onCancel={() => {
            setShowConfirmDelete(false);
            setCommentToDeleteId(null);
          }}
          onConfirm={() => {
            dispatch(
              deleteCommentAsync({ postId, commentId: commentToDeleteId })
            );
            setShowConfirmDelete(false);
            setCommentToDeleteId(null);
          }}
        />
      )}
    </div>
  );
};

// ---------- PostComponent ----------
const PostComponent: FC<PostComponentProps> = ({ postId }) => {
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((state: RootState) => state.auth);
  const post = useSelector((state: RootState) => selectPostById(state, postId));
  const [showDropDown, setShowDropDown] = useState(false);
  const [showCommentForm, setShowCommentForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const postOptionsRef = useRef<HTMLDivElement>(null);
  useClickOutside(postOptionsRef, () => setShowDropDown(false));

  const hasLiked = React.useMemo(() => {
    return !!user && post?.likes.includes(user._id);
  }, [user, post]);

  const handleLike = () => {
    if (!user || !post) {
      alert("User or post missing!");
      return;
    }
    dispatch(toggleLikeAsync({ postId: post._id, userId: user._id }));
  };

  const { error } = useSelector((state: RootState) => state.posts);

  if (error) {
    return (
      <div className="post-container error">Error loading post: {error}</div>
    );
  }

  if (!post) return <div className="post-container">Post not found.</div>;

  const isOwnPost = post.author._id === user?._id;
  const avatar =
    isOwnPost && user?.profilePicture
      ? user.profilePicture
      : post.author?.profilePicture || defaultAvatar;

  const displayName =
    post.author._id === user?._id ? user?.username : post.author.username;

  const commentRef = useRef<HTMLDivElement>(null);
  const commentToggleRef = useRef<HTMLButtonElement>(null);

  useClickOutside(
    commentRef,
    () => {
      if (showCommentForm) setShowCommentForm(false);
    },
    commentToggleRef
  );

  return (
    <div className="post-container">
      <div className="post-header">
        <div className="author-info">
          <img src={avatar} alt="profile" className="profile-pic" />
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
            >
              <BsThreeDots />
            </button>

            {showDropDown && (
              <div className="dropdown-menu">
                <button
                  onClick={() => {
                    setShowDropDown(false);
                    setIsEditing(true);
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
                onConfirm={() => {
                  dispatch(deletePostAsync(post._id));
                  setShowConfirm(false);
                }}
              />
            )}
          </div>
        )}
      </div>

      {isEditing ? (
        <>
          <div className="blur-overlay"></div>
          <PostEditForm post={post} onCancel={() => setIsEditing(false)} />
        </>
      ) : (
        <>
          <p className="post-description">{post.content}</p>
          {post.media.length > 0 && <MediaCarousel media={post.media} />}
        </>
      )}

      <div className="post-actions">
        <button onClick={handleLike}>
          {hasLiked ? <FaHeart className="liked" /> : <FaRegHeart />}
          <span>{post.likes.length}</span>
        </button>

        <button
          ref={commentToggleRef}
          onClick={() => setShowCommentForm((prev) => !prev)}
        >
          <FaRegComment />
          <span>{post.comments?.length}</span>
        </button>
      </div>

      {showCommentForm && (
        <div className="comment-section" ref={commentRef}>
          <CommentForm postId={post._id} />
          <Comment comments={post.comments} postId={post._id} />
        </div>
      )}
    </div>
  );
};

export default PostComponent;
