import { prisma } from "@/lib/prisma";
import { fanDisplayName } from "@/lib/social";
import { Avatar } from "@/components/ui/Avatar";
import { CommentForm } from "@/components/comments/CommentForm";
import { CommentDeleteButton } from "@/components/comments/CommentDeleteButton";

interface Props {
  contentId: string;
  /** Session user id (undefined when logged out). */
  viewerId?: string;
  /** True when the viewer is the content's creator or an admin. */
  viewerModerates: boolean;
}

const MAX_SHOWN = 50;

/** Server-rendered comment list + client composer. */
export async function CommentSection({ contentId, viewerId, viewerModerates }: Props) {
  const [total, comments] = await Promise.all([
    prisma.comment.count({ where: { contentId } }),
    prisma.comment.findMany({
      where: { contentId },
      orderBy: { createdAt: "desc" },
      take: MAX_SHOWN,
      include: {
        user: {
          select: { id: true, name: true, creatorProfile: { select: { handle: true, displayName: true } } },
        },
      },
    }),
  ]);

  return (
    <section id="comments" className="mt-8 border-t border-border pt-6">
      <h2 className="text-sm font-semibold text-text">
        댓글 <span className="numeric text-text-muted">{total.toLocaleString()}</span>
      </h2>

      <div className="mt-4">
        <CommentForm contentId={contentId} loggedIn={Boolean(viewerId)} />
      </div>

      {comments.length > 0 ? (
        <ul className="mt-5 flex flex-col gap-4">
          {comments.map((c) => {
            const isCreatorComment = Boolean(c.user.creatorProfile);
            const displayName = c.user.creatorProfile?.displayName ?? fanDisplayName(c.user);
            const canDelete = viewerModerates || c.userId === viewerId;
            return (
              <li key={c.id} className="flex items-start gap-3">
                <Avatar seed={c.user.creatorProfile?.handle ?? c.user.id} name={displayName} size={32} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-text">
                    <span className={`font-semibold ${isCreatorComment ? "text-accent" : ""}`}>
                      {displayName}
                    </span>{" "}
                    {c.body}
                  </p>
                  <p className="numeric mt-0.5 text-[11px] text-text-muted">
                    {c.createdAt.toLocaleString("ko-KR", { dateStyle: "medium", timeStyle: "short" })}
                  </p>
                </div>
                {canDelete ? <CommentDeleteButton commentId={c.id} /> : null}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="mt-5 text-sm text-text-muted">첫 댓글을 남겨보세요.</p>
      )}
      {total > MAX_SHOWN ? (
        <p className="mt-4 text-xs text-text-muted">최근 {MAX_SHOWN}개의 댓글만 표시됩니다.</p>
      ) : null}
    </section>
  );
}
