import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabase'
import './AnonymousBoard.css'

export default function AnonymousBoard({ onBack }) {
  const [posts, setPosts] = useState([])
  const [content, setContent] = useState('')
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const loadPosts = useCallback(async (currentUser) => {
    setErrorMessage('')

    const { data: postData, error: postError } = await supabase
      .from('anonymous_posts')
      .select('id, user_id, content, created_at')
      .order('created_at', { ascending: false })

    if (postError) throw postError

    const { data: likeData, error: likeError } = await supabase
      .from('anonymous_post_likes')
      .select('post_id, user_id')

    if (likeError) throw likeError

    const likesByPost = new Map()
    const likedPostIds = new Set()

    for (const like of likeData ?? []) {
      likesByPost.set(
        like.post_id,
        (likesByPost.get(like.post_id) ?? 0) + 1
      )

      if (like.user_id === currentUser?.id) {
        likedPostIds.add(like.post_id)
      }
    }

    setPosts(
      (postData ?? []).map((post) => ({
        id: post.id,
        content: post.content,
        created_at: post.created_at,
        isMine: post.user_id === currentUser?.id,
        likeCount: likesByPost.get(post.id) ?? 0,
        likedByMe: likedPostIds.has(post.id),
      }))
    )
  }, [])

  useEffect(() => {
    let active = true

    const init = async () => {
      setLoading(true)

      try {
        const {
          data: { user: currentUser },
          error: userError,
        } = await supabase.auth.getUser()

        if (userError) throw userError

        if (!currentUser) {
          throw new Error('로그인이 필요합니다. 다시 로그인해 주세요.')
        }

        if (!active) return

        setUser(currentUser)
        await loadPosts(currentUser)
      } catch (error) {
        if (active) {
          setErrorMessage(
            error.message || '게시글을 불러오지 못했습니다.'
          )
        }
      } finally {
        if (active) setLoading(false)
      }
    }

    init()

    return () => {
      active = false
    }
  }, [loadPosts])

  const handleSubmit = async (event) => {
    event.preventDefault()

    const trimmed = content.trim()

    if (!trimmed || !user || submitting) return

    setSubmitting(true)
    setErrorMessage('')

    try {
      const { data, error } = await supabase
        .from('anonymous_posts')
        .insert({
          user_id: user.id,
          content: trimmed,
        })
        .select('id, user_id, content, created_at')
        .single()

      if (error) throw error

      setPosts((current) => [
        {
          id: data.id,
          content: data.content,
          created_at: data.created_at,
          isMine: true,
          likeCount: 0,
          likedByMe: false,
        },
        ...current,
      ])

      setContent('')
    } catch (error) {
      setErrorMessage(
        error.message || '게시글을 등록하지 못했습니다.'
      )
    } finally {
      setSubmitting(false)
    }
  }

  const handleLike = async (postId) => {
    if (!user) return

    const post = posts.find((item) => item.id === postId)

    if (!post) return

    // 목록 전체를 새로 불러오지 않고 해당 글만 즉시 갱신
    setPosts((current) =>
      current.map((item) =>
        item.id === postId
          ? {
              ...item,
              likedByMe: !post.likedByMe,
              likeCount: Math.max(
                0,
                item.likeCount + (post.likedByMe ? -1 : 1)
              ),
            }
          : item
      )
    )

    try {
      if (post.likedByMe) {
        const { error } = await supabase
          .from('anonymous_post_likes')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', user.id)

        if (error) throw error
      } else {
        const { error } = await supabase
          .from('anonymous_post_likes')
          .insert({
            post_id: postId,
            user_id: user.id,
          })

        if (error) throw error
      }
    } catch (error) {
      // 실패했을 때만 좋아요 상태를 되돌림
      setPosts((current) =>
        current.map((item) =>
          item.id === postId
            ? {
                ...item,
                likedByMe: post.likedByMe,
                likeCount: Math.max(
                  0,
                  item.likeCount + (post.likedByMe ? -1 : 1)
                ),
              }
            : item
        )
      )

      setErrorMessage(
        error.message || '좋아요 처리에 실패했습니다.'
      )
    }
  }

  const handleDelete = async (postId) => {
    if (!user || !window.confirm('해당 글을 삭제할까요?')) return

    const previousPosts = posts

    setPosts((current) =>
      current.filter((post) => post.id !== postId)
    )
    setErrorMessage('')

    const { error } = await supabase
      .from('anonymous_posts')
      .delete()
      .eq('id', postId)
      .eq('user_id', user.id)

    if (error) {
      setPosts(previousPosts)
      setErrorMessage(
        error.message || '삭제하지 못했습니다.'
      )
    }
  }

  return (
    <section className="anonymous-board auth-panel">
      {/* 다른 하위 메뉴와 동일한 공통 백버튼 */}
      <button
        type="button"
        className="back-button"
        onClick={onBack}
      >
        ← BACK
      </button>

      <h2 className="anonymous-board-title">익명 게시판</h2>

      <form
        className="anonymous-write-form"
        onSubmit={handleSubmit}
      >
        <label
          className="anonymous-write-label"
          htmlFor="anonymous-content"
        >
          남기고 싶은 말을 적어 주세요.
        </label>

        <textarea
          id="anonymous-content"
          className="anonymous-content-input"
          value={content}
          onChange={(event) => setContent(event.target.value)}
          placeholder="모든 글은 익명으로 표시되지만, 욕설이나 비방 등에 주의해 주세요.
또한, 국립 아마노가와 특별 육성 기관에 대한 허위사실 유포 시 법적 책임을 질 수 있습니다."
          maxLength={2000}
          rows={4}
          required
        />

        <div className="anonymous-write-footer">
          <span>{content.length} / 2000</span>

          <button
            className="anonymous-submit-button"
            type="submit"
            disabled={submitting || !content.trim()}
          >
            {submitting ? '등록 중...' : '게시하기'}
          </button>
        </div>
      </form>

      {errorMessage && (
        <p className="anonymous-error" role="alert">
          {errorMessage}
        </p>
      )}

      {loading ? (
        <p className="anonymous-empty">
          게시글을 불러오는 중...
        </p>
      ) : posts.length === 0 ? (
        <p className="anonymous-empty">
          아직 남겨진 글이 없습니다.
        </p>
      ) : (
        <div className="anonymous-post-list">
          {posts.map((post) => (
            <article className="anonymous-post" key={post.id}>
              <p className="anonymous-post-content">
                {post.content}
              </p>

              <div className="anonymous-post-footer">
                <time dateTime={post.created_at}>
                  {new Date(post.created_at).toLocaleString(
                    'ko-KR',
                    {
                      year: 'numeric',
                      month: '2-digit',
                      day: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                    }
                  )}
                </time>

                <div className="anonymous-post-actions">
                  <button
                    type="button"
                    className={`anonymous-like-button ${
                      post.likedByMe ? 'is-liked' : ''
                    }`}
                    onClick={() => handleLike(post.id)}
                    aria-pressed={post.likedByMe}
                    aria-label={
                      post.likedByMe ? '좋아요 취소' : '좋아요'
                    }
                  >
                    {post.likedByMe ? '♥' : '♡'}{' '}
                    <span>{post.likeCount}</span>
                  </button>

                  {post.isMine && (
                    <button
                      type="button"
                      className="anonymous-delete-button"
                      onClick={() => handleDelete(post.id)}
                    >
                      삭제
                    </button>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}