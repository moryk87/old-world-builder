import { useState, useEffect, Fragment } from "react";
import { useParams, useLocation, Redirect } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { FormattedMessage, useIntl } from "react-intl";
import { Helmet } from "react-helmet-async";

import { List } from "../../components/list";
import { Icon } from "../../components/icon";
import { Header, Main } from "../../components/page";
import { addUnit } from "../../state/lists";
import { setArmy } from "../../state/army";
import { getRandomId } from "../../utils/id";
import { useLanguage } from "../../utils/useLanguage";
import { updateIds } from "../../utils/id";
import { fetcher } from "../../utils/fetcher";
import gameSystems from "../../assets/armies.json";

const getArmyData = ({ data, armyComposition }) => {
  // Remove units that don't belong to the army composition
  const characters = data.characters.filter(
    (unit) =>
      (unit?.armyComposition && unit.armyComposition[armyComposition]) ||
      !unit.armyComposition
  );
  const core = data.core.filter(
    (unit) =>
      (unit?.armyComposition && unit.armyComposition[armyComposition]) ||
      !unit.armyComposition
  );
  const special = data.special.filter(
    (unit) =>
      (unit?.armyComposition && unit.armyComposition[armyComposition]) ||
      !unit.armyComposition
  );
  const rare = data.rare.filter(
    (unit) =>
      (unit?.armyComposition && unit.armyComposition[armyComposition]) ||
      !unit.armyComposition
  );

  // Get units moving category
  const specialToCore = special.filter(
    (unit) =>
      unit?.armyComposition &&
      unit.armyComposition[armyComposition].category === "core"
  );
  const rareToCore = rare.filter(
    (unit) =>
      unit?.armyComposition &&
      unit.armyComposition[armyComposition].category === "rare"
  );
  const rareToSpecial = rare.filter(
    (unit) =>
      unit?.armyComposition &&
      unit.armyComposition[armyComposition].category === "special"
  );
  const coreToSpecial = core.filter(
    (unit) =>
      unit?.armyComposition &&
      unit.armyComposition[armyComposition].category === "special"
  );
  const specialToRare = special.filter(
    (unit) =>
      unit?.armyComposition &&
      unit.armyComposition[armyComposition].category === "rare"
  );

  // Remove units from old category
  const allCore = [...core, ...specialToCore, ...rareToCore].filter(
    (unit) =>
      (unit?.armyComposition &&
        unit.armyComposition[armyComposition].category === "core") ||
      !unit.armyComposition
  );
  const allSpecial = [...special, ...coreToSpecial, ...rareToSpecial].filter(
    (unit) =>
      (unit?.armyComposition &&
        unit.armyComposition[armyComposition].category === "special") ||
      !unit.armyComposition
  );
  const allRare = [...rare, ...specialToRare].filter(
    (unit) =>
      (unit?.armyComposition &&
        unit.armyComposition[armyComposition].category === "rare") ||
      !unit.armyComposition
  );

  return {
    lords: updateIds(data.lords),
    heroes: updateIds(data.heroes),
    characters: updateIds(characters),
    core: updateIds(allCore),
    special: updateIds(allSpecial),
    rare: updateIds(allRare),
    mercenaries: updateIds(data.mercenaries),
    allies: updateIds(data.allies),
  };
};

let allAllies = [];

export const Add = ({ isMobile }) => {
  const MainComponent = isMobile ? Main : Fragment;
  const { listId, type } = useParams();
  const dispatch = useDispatch();
  const [redirect, setRedirect] = useState(null);
  const [alliesLoaded, setAlliesLoaded] = useState(0);
  const intl = useIntl();
  const location = useLocation();
  const { language } = useLanguage();
  const list = useSelector((state) =>
    state.lists.find(({ id }) => listId === id)
  );
  const army = useSelector((state) => state.army);
  const game = gameSystems.find((game) => game.id === list?.game);
  const armyData = game?.armies.find((army) => army.id === list.army);
  const allies = armyData?.allies;
  const handleAdd = (unit) => {
    const newUnit = {
      ...unit,
      id: `${unit.id}.${getRandomId()}`,
    };

    dispatch(addUnit({ listId, type, unit: newUnit }));
    setRedirect(newUnit.id);
  };
  const getUnit = (unit) => (
    <List key={unit.id} onClick={() => handleAdd(unit)}>
      <span className="unit__name">
        {unit.minimum ? `${unit.minimum} ` : null}
        <b>{unit[`name_${language}`] || unit.name_en}</b>
      </span>
      <i className="unit__points">{`${
        unit.minimum ? unit.points * unit.minimum : unit.points
      } ${intl.formatMessage({
        id: "app.points",
      })}`}</i>
    </List>
  );

  useEffect(() => {
    window.scrollTo(0, 0);
    allAllies = [];
  }, [location.pathname]);

  useEffect(() => {
    if (list && !army && type !== "allies") {
      fetcher({
        url: `games/${list.game}/${list.army}`,
        onSuccess: (data) => {
          const armyData = getArmyData({
            data,
            armyComposition: list.armyComposition || list.army,
          });
          dispatch(setArmy(armyData));
        },
      });
    } else if (list && type === "allies" && allAllies.length === 0 && allies) {
      setAlliesLoaded(false);
      allies.forEach((ally, index) => {
        fetcher({
          url: `games/${list.game}/${ally}`,
          onSuccess: (data) => {
            const armyData = getArmyData({
              data,
              armyComposition: ally,
            });
            allAllies = [...allAllies, { ...armyData, ally }];
            setAlliesLoaded(index + 1);
          },
        });
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [list, army, allies, type]);

  if (redirect) {
    return <Redirect to={`/editor/${listId}/${type}/${redirect}`} />;
  }

  if (
    (!army && type !== "allies") ||
    (type === "allies" &&
      !allies &&
      alliesLoaded === 0 &&
      allAllies.length !== allies?.length)
  ) {
    if (isMobile) {
      return (
        <>
          <Header to={`/editor/${listId}`} />
          <Main loading />
        </>
      );
    } else {
      return (
        <>
          <Header to={`/editor/${listId}`} isSection />
          <Main loading />
        </>
      );
    }
  }

  return (
    <>
      <Helmet>
        <title>{`Old World Builder | ${list?.name}`}</title>
      </Helmet>

      {isMobile && (
        <Header
          to={`/editor/${listId}`}
          headline={intl.formatMessage({
            id: "add.title",
          })}
        />
      )}

      <MainComponent>
        {!isMobile && (
          <Header
            isSection
            to={`/editor/${listId}`}
            headline={intl.formatMessage({
              id: "add.title",
            })}
          />
        )}
        {type === "allies" ? (
          <>
            <p className="unit__notes">
              <Icon symbol="error" className="unit__notes-icon" />
              <FormattedMessage id="add.alliesInfo" />
            </p>
            <ul>
              {allAllies.map(
                ({ characters, core, special, rare, ally }, index) => (
                  <Fragment key={index}>
                    <header className="editor__header">
                      <h2>
                        {game.armies.find((army) => army.id === ally)[
                          `name_${language}`
                        ] || armyData.name_en}
                      </h2>
                    </header>
                    {characters.map((unit) => getUnit(unit))}
                    {core.map((unit) => getUnit(unit))}
                    {special.map((unit) => getUnit(unit))}
                    {rare.map((unit) => getUnit(unit))}
                  </Fragment>
                )
              )}
            </ul>
          </>
        ) : (
          <ul>{army[type].map((unit) => getUnit(unit))}</ul>
        )}
      </MainComponent>
    </>
  );
};
