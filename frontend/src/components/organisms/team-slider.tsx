import { TeamCard } from "../molecules/cards/team-card";
import { SliderContainer } from "../molecules/slider-container";
type TeamSliderProps = {
  teams: Types.Team[]
}

export function TeamSlider({teams}: TeamSliderProps) {
  return (
    <SliderContainer itemWidth={180}>
      {teams.map((team, idx) => (
        <div
        key={idx}
        className="px-2 h-full"

      >
        <TeamCard
          key={idx}
          team={team}
        />

      </div>
      ))}
    </SliderContainer>
  )
}