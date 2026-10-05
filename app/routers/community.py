from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Poll, PollOption, PollVote
from app.schemas import PollVoteCreate
from app.services import poll_result

router = APIRouter(prefix="/api", tags=["community"])


@router.get("/polls")
def get_polls(db: Session = Depends(get_db)):
    polls = db.query(Poll).all()
    result = []
    for poll in polls:
        result.append({
            "id": poll.id,
            "question": poll.question,
            "results": poll_result(db, poll.id),
        })
    return result


@router.post("/polls/{poll_id}/vote")
def vote_poll(poll_id: int, payload: PollVoteCreate, db: Session = Depends(get_db)):
    poll = db.query(Poll).filter(Poll.id == poll_id).first()
    if not poll:
        raise HTTPException(status_code=404, detail="Poll not found")

    option = db.query(PollOption).filter(PollOption.id == payload.option_id, PollOption.poll_id == poll_id).first()
    if not option:
        raise HTTPException(status_code=400, detail="Invalid poll option")

    session_key = "session-demo"
    previous_vote = db.query(PollVote).filter(PollVote.poll_id == poll_id, PollVote.session_key == session_key).first()
    if previous_vote:
        return {"message": "You have already voted in this poll.", "results": poll_result(db, poll_id)}

    db.add(PollVote(poll_id=poll_id, option_id=payload.option_id, session_key=session_key))
    option.vote_count += 1
    db.commit()
    return {"message": "Vote recorded.", "results": poll_result(db, poll_id)}
