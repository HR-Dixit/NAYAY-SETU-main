import "./Card.css";

const Card = ({ onclick, image, title, description, BtnTXT }) => {
  return (
    <article className="flip-card" onClick={onclick}>
      <div className="flip-card-front">
        <img src={image} alt={title} />
        <h2>{title}</h2>
        <p>{description}</p>
        <button
          className="learn-more-btn btn-grad"
          onClick={(event) => {
            event.stopPropagation();
            onclick?.();
          }}
        >
          {BtnTXT}
        </button>
      </div>
    </article>
  );
};

export default Card;
