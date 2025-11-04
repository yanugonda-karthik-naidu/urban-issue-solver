import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Heart, Share2, Image as ImageIcon, MapPin, MessageCircle } from "lucide-react";
import { motion } from "framer-motion";

interface Post {
  id: number;
  content: string;
  media_url?: string;
  likes: number;
  comments: string[];
  created_at: string;
}

export default function PostFeed() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [newComment, setNewComment] = useState<Record<number, string>>({});

  // Load posts from localStorage
  useEffect(() => {
    const savedPosts = localStorage.getItem("posts");
    if (savedPosts) setPosts(JSON.parse(savedPosts));
  }, []);

  // Save posts whenever they change
  useEffect(() => {
    localStorage.setItem("posts", JSON.stringify(posts));
  }, [posts]);

  // Create a new post
  async function handleSubmit() {
    if (!text && !file) return alert("Please enter text or select an image/video.");
    setUploading(true);

    let fileUrl: string | null = null;

    // Convert image/video to a local URL
    if (file) {
      fileUrl = URL.createObjectURL(file);
    }

    const newPost: Post = {
      id: Date.now(),
      content: text,
      media_url: fileUrl || undefined,
      likes: 0,
      comments: [],
      created_at: new Date().toISOString(),
    };

    setPosts([newPost, ...posts]);
    setText("");
    setFile(null);
    setUploading(false);
  }

  // Like a post
  function handleLike(id: number) {
    setPosts((prev) =>
      prev.map((post) =>
        post.id === id ? { ...post, likes: post.likes + 1 } : post
      )
    );
  }

  // Add a comment
  function handleAddComment(id: number) {
    if (!newComment[id]) return;
    setPosts((prev) =>
      prev.map((post) =>
        post.id === id
          ? { ...post, comments: [...post.comments, newComment[id]] }
          : post
      )
    );
    setNewComment((prev) => ({ ...prev, [id]: "" }));
  }

  return (
    <div className="max-w-2xl mx-auto py-6 space-y-6">
      {/* ✍️ Create Post Card */}
      <Card className="p-4">
        <CardContent>
          <textarea
            className="w-full border rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={3}
            placeholder="Share your thoughts or updates..."
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <div className="flex items-center justify-between mt-3">
            <div className="flex gap-3 items-center">
              <label className="cursor-pointer flex items-center gap-1">
                <ImageIcon className="w-5 h-5" />
                <input
                  type="file"
                  accept="image/*,video/*"
                  hidden
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                />
              </label>
            </div>
            <Button onClick={handleSubmit} disabled={uploading}>
              {uploading ? "Posting..." : "Post"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 📰 Posts Feed */}
      <div className="space-y-4">
        {posts.length === 0 && (
          <p className="text-center text-gray-500">No posts yet. Be the first to share!</p>
        )}

        {posts.map((post) => (
          <motion.div
            key={post.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white shadow rounded-xl p-4 border"
          >
            <div className="flex items-center gap-3 mb-2">
              <Avatar />
              <div>
                <p className="font-semibold">Community User</p>
                <p className="text-xs text-gray-500">
                  {new Date(post.created_at).toLocaleString()}
                </p>
              </div>
            </div>

            <p className="mb-2 whitespace-pre-wrap break-words">{post.content}</p>

            {/* 🖼️ Media Preview */}
            {post.media_url && (
              post.media_url.includes("video")
                ? (
                  <video controls className="w-full rounded-lg" src={post.media_url}></video>
                )
                : (
                  <img
                    src={post.media_url}
                    alt="Post media"
                    className="w-full rounded-lg"
                  />
                )
            )}

            {/* ❤️ Like & Share */}
            <div className="flex justify-between mt-3 text-gray-600">
              <Button variant="ghost" size="sm" onClick={() => handleLike(post.id)}>
                <Heart className="w-4 h-4 mr-1" /> {post.likes}
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  navigator.share?.({
                    title: "Check out this post!",
                    text: post.content,
                    url: window.location.href,
                  })
                }
              >
                <Share2 className="w-4 h-4 mr-1" /> Share
              </Button>
            </div>

            {/* 💬 Comments Section */}
            <div className="mt-4 border-t pt-3">
              <p className="font-semibold text-sm mb-2 flex items-center gap-1">
                <MessageCircle className="w-4 h-4" /> Comments
              </p>
              {post.comments.length === 0 && (
                <p className="text-xs text-gray-500">No comments yet</p>
              )}

              <div className="space-y-2">
                {post.comments.map((c, i) => (
                  <div
                    key={i}
                    className="bg-gray-100 text-sm p-2 rounded-md text-gray-700"
                  >
                    {c}
                  </div>
                ))}
              </div>

              <div className="flex mt-2 gap-2">
                <input
                  type="text"
                  placeholder="Write a comment..."
                  value={newComment[post.id] || ""}
                  onChange={(e) =>
                    setNewComment({ ...newComment, [post.id]: e.target.value })
                  }
                  className="flex-1 text-sm border rounded-lg px-2 py-1 focus:outline-none"
                />
                <Button size="sm" onClick={() => handleAddComment(post.id)}>
                  Post
                </Button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
