import { AnimatePresence, motion } from "framer-motion";
import { Check, CheckCheck, Info, Loader2, Phone, Plus, Shield, UserMinus, UserPlus, X } from "lucide-react";
import {
  DialogShell,
  DialogShellContent,
  DialogShellDescription,
  DialogShellHeader,
  DialogShellTitle,
} from "@/components/ui/dialog-shell";
import { Button } from "@/components/ui/button";
import { SearchField } from "@/components/ui/search-field";
import { StatusBadge } from "@/components/ui/status-badge";
import { UserListItem } from "@/components/ui/user-list-item";

const getEntityId = (value) => {
  if (!value) return null;
  if (typeof value === "string") return value;
  if (typeof value === "object") {
    if (value._id) return value._id.toString();
    if (value.id) return value.id.toString();
    if (value.userId) return getEntityId(value.userId);
  }
  return value?.toString?.() || null;
};

const findReadReceipt = (message, participantId) => {
  if (!Array.isArray(message?.seenBy) || !participantId) return null;
  return message.seenBy.find((receipt) => getEntityId(receipt?.userId ?? receipt) === participantId) || null;
};

const formatTimestamp = (dateStr) => {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export default function GroupDialogs({
  showAddContact,
  setShowAddContact,
  newContactName,
  setNewContactName,
  onAddContact,
  adminNotice,
  showAddMember,
  setShowAddMember,
  phoneToAdd,
  setPhoneToAdd,
  isAddingByPhone,
  onAddMemberByPhone,
  pastChatUsers,
  contacts,
  selectedChat,
  myUserId,
  onAddMemberToGroup,
  showRemoveMember,
  setShowRemoveMember,
  onRemoveMemberFromGroup,
  showParticipants,
  setShowParticipants,
  showMessageInfo,
  closeMessageInfo,
  selectedMessageForInfo,
  savedContact,
}) {
  return (
    <>
      <DialogShell open={showAddContact} onOpenChange={setShowAddContact}>
        <DialogShellContent className="max-w-md">
          <DialogShellHeader>
            <DialogShellTitle>Save contact</DialogShellTitle>
            <DialogShellDescription>Store this chat with a name you will recognize later.</DialogShellDescription>
          </DialogShellHeader>
          <div className="space-y-4">
            <SearchField
              value={newContactName}
              onChange={(event) => setNewContactName(event.target.value)}
              placeholder="Saving contact as..."
            />
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowAddContact(false)}>
                Cancel
              </Button>
              <Button onClick={onAddContact}>Save</Button>
            </div>
          </div>
        </DialogShellContent>
      </DialogShell>

      <DialogShell open={showAddMember} onOpenChange={setShowAddMember}>
        <DialogShellContent className="max-w-2xl">
          <DialogShellHeader>
            <DialogShellTitle>Expand your circle</DialogShellTitle>
            <DialogShellDescription>Add members quickly by phone, recent chats, or saved contacts.</DialogShellDescription>
          </DialogShellHeader>
          <div className="space-y-6">
            <div className="space-y-3">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-primary">Quick add by phone</p>
              <div className="flex gap-3">
                <SearchField
                  value={phoneToAdd}
                  onChange={(event) => setPhoneToAdd(event.target.value)}
                  placeholder="Phone (+91...)"
                  icon={Phone}
                  className="flex-1"
                />
                <Button onClick={onAddMemberByPhone} disabled={isAddingByPhone || !phoneToAdd.trim()}>
                  {isAddingByPhone ? <Loader2 className="animate-spin" /> : "Add"}
                </Button>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-muted-foreground">Suggested from chats</p>
                <div className="max-h-60 space-y-2 overflow-y-auto pr-1">
                  {pastChatUsers.filter((user) => !contacts.some((contact) => contact.userId?.toString() === (user._id || user).toString())).length ? (
                    pastChatUsers
                      .filter((user) => !contacts.some((contact) => contact.userId?.toString() === (user._id || user).toString()))
                      .map((user) => {
                        const isAlreadyIn =
                          Array.isArray(selectedChat.participants) &&
                          selectedChat.participants.some((participant) => (participant?._id || participant).toString() === (user._id || user).toString());

                        return (
                          <UserListItem
                            key={user._id || user}
                            title={user.name || user.phoneNumber}
                            subtitle={isAlreadyIn ? "Already in group" : "Recent chat"}
                            avatarSrc={user.avatar ? `http://localhost:5002${user.avatar}` : undefined}
                            avatarFallback={user.name?.[0] || user.phoneNumber?.slice(-2) || "?"}
                            rightContent={
                              isAlreadyIn ? (
                                <StatusBadge status="active" label="Added" />
                              ) : (
                                <Button size="sm" onClick={() => onAddMemberToGroup(user._id || user)}>
                                  <Plus size={14} />
                                  Add
                                </Button>
                              )
                            }
                          />
                        );
                      })
                  ) : (
                    <p className="rounded-2xl border border-border/60 bg-muted/30 px-4 py-6 text-center text-xs text-muted-foreground">
                      No new suggestions from recent chats.
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-muted-foreground">Your contacts</p>
                <div className="max-h-60 space-y-2 overflow-y-auto pr-1">
                  {contacts.filter((contact) => contact.userId?.toString() !== myUserId?.toString()).length ? (
                    contacts
                      .filter((contact) => contact.userId?.toString() !== myUserId?.toString())
                      .map((contact) => {
                        const isAlreadyIn =
                          Array.isArray(selectedChat.participants) &&
                          selectedChat.participants.some((participant) => (participant?._id || participant).toString() === contact.userId?.toString());

                        return (
                          <UserListItem
                            key={contact.userId}
                            title={contact.savedName}
                            subtitle={isAlreadyIn ? "Already in group" : "Contact"}
                            avatarFallback={contact.savedName?.[0] || "?"}
                            rightContent={
                              isAlreadyIn ? (
                                <StatusBadge status="active" label="Added" />
                              ) : (
                                <Button size="sm" onClick={() => onAddMemberToGroup(contact.userId)}>
                                  <Plus size={14} />
                                  Add
                                </Button>
                              )
                            }
                          />
                        );
                      })
                  ) : (
                    <p className="rounded-2xl border border-border/60 bg-muted/30 px-4 py-6 text-center text-xs text-muted-foreground">
                      No contacts available.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </DialogShellContent>
      </DialogShell>

      <DialogShell open={showRemoveMember} onOpenChange={setShowRemoveMember}>
        <DialogShellContent className="max-w-lg">
          <DialogShellHeader>
            <DialogShellTitle>Manage collective</DialogShellTitle>
            <DialogShellDescription>Remove members from the current group conversation.</DialogShellDescription>
          </DialogShellHeader>
          <div className="max-h-[28rem] space-y-2 overflow-y-auto pr-1">
            {Array.isArray(selectedChat?.participants)
              ? selectedChat.participants
                  .filter((participant) => participant && (participant._id || participant).toString() !== myUserId?.toString())
                  .map((participant) => (
                    <UserListItem
                      key={participant._id || participant}
                      title={participant.name || "Member"}
                      subtitle={participant.phoneNumber || "Participant"}
                      avatarSrc={participant.avatar ? `http://localhost:5002${participant.avatar}` : undefined}
                      avatarFallback={participant.name?.[0] || "?"}
                      rightContent={
                        <Button variant="destructive" size="sm" onClick={() => onRemoveMemberFromGroup(participant._id || participant)}>
                          Remove
                        </Button>
                      }
                    />
                  ))
              : null}
          </div>
        </DialogShellContent>
      </DialogShell>

      <DialogShell open={showParticipants} onOpenChange={setShowParticipants}>
        <DialogShellContent className="max-w-xl">
          <DialogShellHeader>
            <DialogShellTitle>Chat participants</DialogShellTitle>
            <DialogShellDescription>Review who is currently part of this conversation.</DialogShellDescription>
          </DialogShellHeader>
          <div className="max-h-[28rem] space-y-2 overflow-y-auto pr-1">
            {Array.isArray(selectedChat?.participants)
              ? selectedChat.participants.map((participant) => {
                  const participantId = participant?._id?.toString() || participant?.toString();
                  const adminId = selectedChat.groupAdmin?._id?.toString() || selectedChat.groupAdmin?.toString();
                  const isAdmin = selectedChat.isGroup && adminId && participantId && adminId === participantId;

                  return (
                    <UserListItem
                      key={participant._id || participant}
                      title={participant.name || "Member"}
                      subtitle={participant.phoneNumber || "Participant"}
                      avatarSrc={participant.avatar ? `http://localhost:5002${participant.avatar}` : undefined}
                      avatarFallback={(participant.name?.[0] || "?").toUpperCase()}
                      badge={isAdmin ? <StatusBadge status="active" label="Admin" /> : null}
                      rightContent={
                        (participant._id || participant).toString() === myUserId?.toString() ? (
                          <StatusBadge status="neutral" label="You" />
                        ) : null
                      }
                    />
                  );
                })
              : null}
          </div>
        </DialogShellContent>
      </DialogShell>

      <DialogShell open={Boolean(showMessageInfo && selectedMessageForInfo)} onOpenChange={(open) => !open && closeMessageInfo()}>
        <DialogShellContent className="max-w-xl">
          <DialogShellHeader>
            <DialogShellTitle>Message info</DialogShellTitle>
            <DialogShellDescription>Inspect the message body and participant delivery status.</DialogShellDescription>
          </DialogShellHeader>

          {selectedMessageForInfo ? (
            <div className="space-y-4">
              <div className="rounded-2xl border border-border/60 bg-card/60 p-4">
                <p className="mb-2 text-xs font-black uppercase tracking-[0.2em] text-muted-foreground">Message</p>
                <p className="break-words text-sm text-foreground">{selectedMessageForInfo.content}</p>
              </div>

              <div className="rounded-2xl border border-border/60 bg-card/60 p-4">
                <p className="mb-2 text-xs font-black uppercase tracking-[0.2em] text-muted-foreground">Sent</p>
                <p className="text-sm text-foreground">{formatTimestamp(selectedMessageForInfo.createdAt)}</p>
              </div>

              {(selectedMessageForInfo.sender?._id || selectedMessageForInfo.sender)?.toString() === myUserId?.toString() ? (
                <div className="space-y-2">
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground">Delivery status</p>
                  <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
                    {selectedChat?.participants?.map((participant) => {
                      const participantId = getEntityId(participant);
                      if (participantId === myUserId?.toString()) return null;

                      const readReceipt = findReadReceipt(selectedMessageForInfo, participantId);

                      return (
                        <UserListItem
                          key={participantId}
                          title={selectedChat.isGroup ? participant.name || "Member" : savedContact?.savedName || participant.name || "Unknown"}
                          subtitle={participant.phoneNumber || "Contact"}
                          avatarFallback={(participant.name?.[0] || "?").toUpperCase()}
                          rightContent={
                            readReceipt?.readAt ? (
                              <div className="space-y-1 text-right">
                                <StatusBadge status="active" label="Read" />
                                <p className="text-[10px] text-muted-foreground">{formatTimestamp(readReceipt.readAt)}</p>
                              </div>
                            ) : (
                              <div className="space-y-1 text-right">
                                <StatusBadge status="offline" label="Delivered" />
                                <p className="text-[10px] text-muted-foreground">
                                  {formatTimestamp(selectedMessageForInfo.deliveredAt)}
                                </p>
                              </div>
                            )
                          }
                        />
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
        </DialogShellContent>
      </DialogShell>

      <AnimatePresence>
        {adminNotice ? (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="pointer-events-none absolute left-1/2 top-20 z-[60] flex -translate-x-1/2 items-center gap-3 rounded-2xl border border-destructive/20 bg-destructive/10 px-6 py-3 text-destructive shadow-2xl backdrop-blur-xl"
          >
            <Shield size={18} />
            <span className="text-sm font-bold">{adminNotice}</span>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
